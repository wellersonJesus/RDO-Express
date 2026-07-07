import os
import time
import uuid
import re
import logging
import signal
import sys
import traceback
from datetime import datetime
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dotenv import load_dotenv

from dadoBrutoGrupo import DADOS_BRUTOS


def localizar_env(inicio: Path):
    atual = inicio.resolve()
    for pasta in [atual, *atual.parents]:
        candidato = pasta / ".env"
        if candidato.is_file():
            return candidato
    return None


ENV_PATH = localizar_env(Path(__file__).parent)
load_dotenv(dotenv_path=ENV_PATH) if ENV_PATH else load_dotenv()

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("geraDadosGrupo")

URL = os.getenv("API_URL")
API_KEY = os.getenv("SECRET_KEY")

if not URL or not API_KEY:
    logger.critical("API_URL ou SECRET_KEY ausentes no .env (%s).", ENV_PATH)
    raise SystemExit(f"Configuração inválida: API_URL={URL!r} SECRET_KEY={'*' * len(API_KEY) if API_KEY else None!r}")

SESSAO = requests.Session()
_retry = Retry(total=0)
SESSAO.mount("https://", HTTPAdapter(max_retries=_retry))
SESSAO.mount("http://", HTTPAdapter(max_retries=_retry))

TIMEOUT_CONEXAO = (10, 45)
INTERVALO_ENTRE_REQUISICOES = 0.4
MAX_TENTATIVAS_POST = 3

CLIENTES = {}
COLABORADORES = {}
CLIENTES_PENDENTES = set()

RDOS_EXISTENTES = set()
CHATS_EXISTENTES = set()
RDO_SEQ = 0

STATUS_CLIENTE_PADRAO = "TRUE"
STATUS_PEDIDO_PADRAO = "CONCLUIDO"
TIPO_FINANCEIRO_PADRAO = "RECEITA"

RDO_PATTERN = re.compile(r"^RDO0*(\d+)$", re.IGNORECASE)
HORA_STRICT_PATTERN = re.compile(r"(\d{1,2}):(\d{2})")

MSG_PATTERN = re.compile(
    r"\[(?P<hora>\d{1,2}:\d{2}),\s*(?P<data>\d{2}/\d{2}/\d{4})\]\s*RDOEXPRESS:\s*"
    r"(?P<corpo>.*?)(?=\n\[\d{1,2}:\d{2},\s*\d{2}/\d{2}/\d{4}\]\s*RDOEXPRESS:|\Z)",
    re.DOTALL,
)

DELIM_PEDIDO_PATTERN = re.compile(
    r"^(?P<nome>[A-ZÀ-Ú0-9][A-ZÀ-Ú0-9 .*]{0,40}?)\s*R?\$\s*"
    r"(?P<valor>\d+[.,]\d{1,2})\s*,?\s*$"
)

TIPOS_SERVICO_CONHECIDOS = (
    "COM RETORNO",
    "ENTREGA URGENTE",
    "ENTREGA PRIORIDADE",
    "ENTREGA ATÉ",
    "ENTREGA ate",
    "ENTREGA",
    "COLETA",
    "INSTITUTO",
    "FELICIO ROCHO",
    "MATER DEI",
    "SURGICAL",
    "VILA DA SERRA",
    "SÃO LUCAS",
)

TELEFONE_PATTERN = re.compile(r"(\+?55\s?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}")
SOLICITANTE_PATTERN = re.compile(r"SOLICITANTE\s*:\s*(.+)", re.IGNORECASE)

_LINHAS_BLACKLIST_DELIM = ("PAGAMENTO", "RECEBER", "PIX", "TEL", "RAMAL", "OBS")

PAGAMENTO_SEMANAL = [
    "VAL FORTUNATO", "MARIA PITANGA", "IN CLOSET", "CACAL SHOW", "OPIMINAS",
    "BRENO", "JOSI FRAGA", "MIMA-ME", "NATU PET", "MAURICIO", "JESSICA CESTA",
]
PAGAMENTO_QUINZENAL = ["TELECOM", "AMMI BELVEDERE", "ROSA DALIA"]
PAGAMENTO_MENSAL = ["BASIQUE", "BETE PLURAL", "FFASHION", "ELISA STHANIS"]


class ErroFatalGeracao(Exception):
    pass


class ErroApi(Exception):
    def __init__(self, action, payload, resposta):
        self.action = action
        self.payload = payload
        self.resposta = resposta
        super().__init__(f"Falha na ação '{action}': resposta={resposta!r} payload={payload!r}")


def _normalizar_nome(nome):
    if not nome:
        return ""
    texto = str(nome).upper()
    substituicoes = (
        ("Á", "A"), ("À", "A"), ("Â", "A"), ("Ã", "A"),
        ("É", "E"), ("È", "E"), ("Ê", "E"),
        ("Í", "I"), ("Ì", "I"),
        ("Ó", "O"), ("Ò", "O"), ("Ô", "O"), ("Õ", "O"),
        ("Ú", "U"), ("Ù", "U"),
        ("Ç", "C"),
    )
    for o, d in substituicoes:
        texto = texto.replace(o, d)
    return re.sub(r"[^A-Z0-9]", "", texto)


def _corresponde(nome_normalizado, lista):
    for item in lista:
        normalizado_item = _normalizar_nome(item)
        if normalizado_item and (normalizado_item in nome_normalizado or nome_normalizado in normalizado_item):
            return True
    return False


def determinar_pagamento_cliente(nome_cliente):
    nome_normalizado = _normalizar_nome(nome_cliente)
    if not nome_normalizado:
        return "DIÁRIO"
    if _corresponde(nome_normalizado, PAGAMENTO_SEMANAL):
        return "SEMANAL"
    if _corresponde(nome_normalizado, PAGAMENTO_QUINZENAL):
        return "QUINZENAL"
    if _corresponde(nome_normalizado, PAGAMENTO_MENSAL):
        return "MENSAL"
    return "DIÁRIO"


def post(payload, tentativas=MAX_TENTATIVAS_POST):
    ultimo_erro = None
    for tentativa in range(1, tentativas + 1):
        try:
            resp = SESSAO.post(URL, json=payload, timeout=TIMEOUT_CONEXAO)
        except requests.exceptions.Timeout as exc:
            ultimo_erro = exc
            logger.error("Tentativa %d/%d: TIMEOUT na ação '%s' -> %s", tentativa, tentativas, payload.get("action"), exc)
        except requests.RequestException as exc:
            ultimo_erro = exc
            logger.error("Tentativa %d/%d: ERRO DE REDE na ação '%s' -> %s", tentativa, tentativas, payload.get("action"), exc)
        else:
            if resp.status_code != 200:
                ultimo_erro = ErroApi(payload.get("action"), payload, f"HTTP {resp.status_code}: {resp.text[:500]}")
                logger.error("Tentativa %d/%d: %s", tentativa, tentativas, ultimo_erro)
            else:
                try:
                    corpo = resp.json()
                except ValueError as exc:
                    ultimo_erro = ErroApi(payload.get("action"), payload, f"JSON inválido: {resp.text[:500]} ({exc})")
                    logger.error("Tentativa %d/%d: %s", tentativa, tentativas, ultimo_erro)
                else:
                    if isinstance(corpo, dict) and corpo.get("status") == "error":
                        logger.error("Ação '%s' retornou erro da API: %s", payload.get("action"), corpo)
                    return corpo
        if tentativa < tentativas:
            time.sleep(3 * tentativa)
    raise ErroApi(payload.get("action"), payload, str(ultimo_erro))


def gerar_id_curto(tamanho=11):
    return uuid.uuid4().hex[:tamanho]


def somente_hora(valor):
    if not valor:
        return "00:00"
    match = HORA_STRICT_PATTERN.search(str(valor))
    if not match:
        return "00:00"
    hora = int(match.group(1))
    minuto = match.group(2)
    if hora > 23:
        hora = 0
    return f"{hora:02d}:{minuto}"


def _extrair_lista_dados(resultado, action):
    dados = resultado.get("data") if isinstance(resultado, dict) else resultado
    if not isinstance(dados, list):
        raise ErroFatalGeracao(f"Resposta inesperada em '{action}': esperado list, recebido {type(dados).__name__} -> {resultado!r}")
    return dados


def carregar_rdos_existentes():
    resultado = post({"action": "getpedidos", "apiKey": API_KEY})
    dados = _extrair_lista_dados(resultado, "getpedidos")
    ids = set()
    maior = 0
    for item in dados:
        rdo_id = str(item.get("id", "")).strip().upper()
        if rdo_id:
            ids.add(rdo_id)
            match = RDO_PATTERN.match(rdo_id)
            if match:
                numero = int(match.group(1))
                if numero > maior:
                    maior = numero
    logger.info("Pedidos existentes: %d | Maior sequência: %d", len(ids), maior)
    return ids, maior


def carregar_chats_existentes():
    resultado = post({"action": "getchats", "apiKey": API_KEY})
    dados = _extrair_lista_dados(resultado, "getchats")
    pedidos_com_chat = set()
    for item in dados:
        pedido_id = str(item.get("pedido_id", "")).strip().upper()
        if pedido_id:
            pedidos_com_chat.add(pedido_id)
    logger.info("Pedidos com chat já existente: %d", len(pedidos_com_chat))
    return pedidos_com_chat


def proximo_rdo_id():
    global RDO_SEQ
    while True:
        RDO_SEQ += 1
        candidato = f"RDO{RDO_SEQ:03d}"
        if candidato not in RDOS_EXISTENTES:
            RDOS_EXISTENTES.add(candidato)
            return candidato


def carregar_colaboradores():
    resultado = post({"action": "getcolaboradores", "apiKey": API_KEY})
    dados = _extrair_lista_dados(resultado, "getcolaboradores")
    mapa = {}
    for item in dados:
        nome = str(item.get("username", "")).strip().upper()
        if not nome:
            logger.warning("Colaborador sem 'username' ignorado: %s", item)
            continue
        colaborador_id = item.get("id")
        if colaborador_id is None:
            logger.warning("Colaborador '%s' sem 'id': %s", nome, item)
        mapa[nome] = colaborador_id
    logger.info("Colaboradores carregados: %d", len(mapa))
    return mapa


def carregar_clientes():
    resultado = post({"action": "getclientes", "apiKey": API_KEY})
    dados = _extrair_lista_dados(resultado, "getclientes")
    mapa = {}
    for item in dados:
        nome = str(item.get("username", "")).strip().upper()
        if not nome:
            logger.warning("Cliente sem 'username' ignorado: %s", item)
            continue
        cliente_id = item.get("id")
        if cliente_id is None:
            logger.warning("Cliente '%s' sem 'id': %s", nome, item)
        mapa[nome] = cliente_id
    logger.info("Clientes carregados: %d", len(mapa))
    return mapa


def garantir_cliente(nome_cliente, responsavel=""):
    nome_upper = nome_cliente.strip().upper()
    if not nome_upper:
        logger.error("Nome de cliente vazio recebido em garantir_cliente().")
        return None
    if nome_upper in CLIENTES:
        return CLIENTES[nome_upper]
    if nome_upper in CLIENTES_PENDENTES:
        logger.warning("Cliente '%s' está na lista de pendentes. Nova tentativa não será feita nesta execução.", nome_upper)
        return None

    pagamento_identificado = determinar_pagamento_cliente(nome_upper)

    payload = {
        "action": "criarcliente",
        "apiKey": API_KEY,
        "username": nome_upper,
        "responsavel": responsavel or "",
        "contato": "",
        "imagem": "",
        "pagamento": pagamento_identificado,
        "status": STATUS_CLIENTE_PADRAO,
    }
    try:
        resultado = post(payload)
    except ErroApi as exc:
        CLIENTES_PENDENTES.add(nome_upper)
        logger.error("Exceção ao cadastrar cliente '%s': %s", nome_upper, exc)
        return None

    if resultado and resultado.get("status") == "success":
        novo_id = resultado.get("id") or nome_upper
        CLIENTES[nome_upper] = novo_id
        logger.info("Cliente criado: %s (id=%s, pagamento=%s)", nome_upper, novo_id, pagamento_identificado)
        return novo_id

    CLIENTES_PENDENTES.add(nome_upper)
    logger.error("Falha ao cadastrar cliente '%s': resposta=%s", nome_upper, resultado)
    return None


def definir_prioridade(texto):
    txt = (texto or "").upper()
    if "URGENTE" in txt or "PRIORIDADE" in txt:
        return "Urgente"
    return "Normal"


def parse_valor(valor_str):
    """
    Regras dos dados brutos:
    - O valor sempre termina em separador decimal (','  ou '.') seguido de 1 ou 2 dígitos de centavos.
    - NÃO existe separador de milhar nesse formato (ex: "330.00" é 330 reais e 00 centavos,
      não 330000). O separador (ponto OU vírgula) encontrado imediatamente antes dos 2
      últimos dígitos numéricos é SEMPRE o separador decimal.
    """
    if valor_str is None:
        return 0.0
    if isinstance(valor_str, (int, float)):
        return round(float(valor_str), 2)

    texto = str(valor_str).strip()
    if not texto:
        return 0.0

    texto = texto.replace("R$", "").strip()
    texto = texto.rstrip(",").rstrip()

    match = re.search(r"(\d+)[.,](\d{1,2})\s*$", texto)
    if match:
        parte_inteira = match.group(1)
        parte_decimal = match.group(2).ljust(2, "0")
        try:
            return round(float(f"{parte_inteira}.{parte_decimal}"), 2)
        except (ValueError, TypeError):
            logger.error("Valor inválido não pôde ser convertido: '%s'", valor_str)
            return 0.0

    match_inteiro = re.search(r"(\d+)\s*$", texto)
    if match_inteiro:
        try:
            return round(float(match_inteiro.group(1)), 2)
        except (ValueError, TypeError):
            logger.error("Valor inválido não pôde ser convertido: '%s'", valor_str)
            return 0.0

    logger.error("Valor inválido não pôde ser convertido: '%s'", valor_str)
    return 0.0


def formatar_valor(valor):
    numero = valor if isinstance(valor, (int, float)) else parse_valor(valor)
    return f"{numero:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def definir_colaborador():
    return "GRUPO", ""


def normalizar_data_simples(data_str):
    try:
        return datetime.strptime(data_str, "%d/%m/%Y").strftime("%d/%m/%Y")
    except (ValueError, TypeError):
        logger.warning("Data inválida '%s', usando data atual.", data_str)
        return datetime.now().strftime("%d/%m/%Y")


def _linha_e_delimitador(linha_stripped):
    if ":" in linha_stripped:
        return None
    upper = linha_stripped.upper()
    if any(upper.startswith(p) for p in _LINHAS_BLACKLIST_DELIM):
        return None
    return DELIM_PEDIDO_PATTERN.match(linha_stripped)


def _detectar_tipo_servico(bloco_linhas):
    for linha in bloco_linhas:
        stripped = linha.strip()
        upper = stripped.upper()
        for tipo in TIPOS_SERVICO_CONHECIDOS:
            if upper.startswith(tipo):
                return tipo.upper()
    return "ENTREGA"


def _dividir_pedidos_do_corpo(corpo):
    linhas = corpo.split("\n")
    pedidos_brutos = []
    buffer = []

    for linha in linhas:
        stripped = linha.strip()
        if not stripped:
            buffer.append(linha)
            continue

        match = _linha_e_delimitador(stripped)
        if match:
            nome_empresa = re.sub(r"[*]", "", match.group("nome")).strip()
            valor = match.group("valor")
            pedidos_brutos.append((buffer[:], nome_empresa, valor))
            buffer = []
        else:
            buffer.append(linha)

    if any(l.strip() for l in buffer):
        logger.warning("Bloco sem delimitador de valor reconhecido, ignorado: %r", buffer)

    return pedidos_brutos


def _extrair_solicitante(detalhes_texto):
    match = SOLICITANTE_PATTERN.search(detalhes_texto)
    if match:
        return match.group(1).strip()
    for linha in detalhes_texto.split("\n"):
        linha = linha.strip()
        if linha and not re.search(r"\d", linha[:3]):
            return linha
    return ""


def _extrair_telefone(detalhes_texto):
    match = TELEFONE_PATTERN.search(detalhes_texto)
    return match.group(0).strip() if match else ""


def extrair_pedidos_brutos(texto):
    pedidos = []
    for msg in MSG_PATTERN.finditer(texto):
        hora, data, corpo = msg.group("hora"), msg.group("data"), msg.group("corpo")
        for bloco_linhas, cliente_nome, valor in _dividir_pedidos_do_corpo(corpo):
            tipo_servico = _detectar_tipo_servico(bloco_linhas)
            detalhes = "\n".join(l.strip() for l in bloco_linhas if l.strip())
            pedidos.append({
                "data": data,
                "hora": somente_hora(hora),
                "tipo_servico": tipo_servico,
                "cliente_nome": cliente_nome.strip().upper(),
                "valor_corrida": valor,
                "detalhes": detalhes,
                "solicitante": _extrair_solicitante(detalhes),
                "telefone": _extrair_telefone(detalhes),
            })

    if not pedidos:
        raise ErroFatalGeracao("Nenhum pedido extraído de DADOS_BRUTOS. Verifique o formato de entrada.")

    logger.info("Pedidos extraídos do texto bruto: %d", len(pedidos))
    return pedidos


def montar_texto_chat(rdo_id, pedido):
    solicitante = pedido["solicitante"] or "N/D"
    telefone = pedido["telefone"] or "N/D"
    tipo_servico = pedido["tipo_servico"] or "N/D"
    origem = pedido["cliente_nome"] or "N/D"
    destino = pedido["detalhes"] or "N/D"
    valor = formatar_valor(pedido["valor_corrida"]) if pedido["valor_corrida"] else "0,00"

    linhas = [
        f"📦 N.SERVIÇO: {rdo_id}",
        f"👤 : {solicitante} 📞 : {telefone}",
        f"📦 : {tipo_servico}",
        "📍 ROTAS:",
        f"1. De: {origem} | Para: {destino}.",
        f"🛣️ - km ⏱️ -min 💰 R$ {valor}",
    ]
    return "\n".join(linhas)


def montar_descricao_financeiro(pedido):
    tipo_servico = pedido["tipo_servico"] or "ENTREGA"
    cliente_nome = pedido["cliente_nome"] or ""
    detalhes = pedido["detalhes"] or ""

    partes = [tipo_servico]
    if cliente_nome:
        partes.append(f"de {cliente_nome}")
    if detalhes:
        partes.append(f"para {detalhes}")

    return " ".join(partes).strip()


def montar_dados_consolidados(rdo_id, pedido, id_cliente, motoboy_final, observacao):
    data_str = normalizar_data_simples(pedido["data"])
    hora_str = somente_hora(pedido["hora"])

    cliente_nome = pedido["cliente_nome"]
    tipo_servico = pedido["tipo_servico"]
    endereco_para = pedido["detalhes"]
    solicitante = pedido["solicitante"]

    descricao_final = montar_descricao_financeiro(pedido)
    texto_chat = montar_texto_chat(rdo_id, pedido)
    valor_num = parse_valor(pedido["valor_corrida"])
    valor_formatado = formatar_valor(valor_num)

    return {
        "rdo_id": rdo_id,
        "id_cliente": id_cliente,
        "cliente_nome": cliente_nome,
        "solicitante": solicitante,
        "motoboy_final": motoboy_final,
        "observacao": observacao,
        "data_str": data_str,
        "hora_str": hora_str,
        "status_final": STATUS_PEDIDO_PADRAO,
        "descricao_final": descricao_final,
        "tipo_servico": tipo_servico,
        "endereco_para": endereco_para,
        "texto_chat": texto_chat,
        "valor_num": valor_num,
        "valor_formatado": valor_formatado,
        "email": "",
    }


def criar_pedido(consolidado):
    rdo_id = consolidado["rdo_id"]

    payload = {
        "action": "criarpedido",
        "apiKey": API_KEY,
        "id": rdo_id,
        "id_cliente": consolidado["id_cliente"],
        "cliente": consolidado["cliente_nome"],
        "solicitante": consolidado["solicitante"],
        "contato": consolidado["email"] or consolidado["solicitante"],
        "data": consolidado["data_str"],
        "horario": consolidado["hora_str"],
        "hora": consolidado["hora_str"],
        "mercadoria": consolidado["tipo_servico"],
        "de": consolidado["cliente_nome"],
        "para": consolidado["endereco_para"],
        "retorno": "SIM" if "RETORNO" in consolidado["tipo_servico"].upper() else "NÃO",
        "prioridade": definir_prioridade(consolidado["tipo_servico"] + " " + consolidado["endereco_para"]),
        "valor_corrida": consolidado["valor_formatado"],
        "motoboy": consolidado["motoboy_final"],
        "status": consolidado["status_final"],
        "observacao": consolidado["observacao"],
    }
    try:
        resultado = post(payload)
    except ErroApi as exc:
        logger.error("Exceção ao criar pedido %s: %s", rdo_id, exc)
        return False, str(exc)

    if not resultado or resultado.get("status") != "success":
        detalhe = f"resposta={resultado!r}"
        logger.error("Falha ao criar pedido %s: %s", rdo_id, detalhe)
        return False, detalhe

    logger.info("Pedido criado: %s | cliente=%s | data=%s | status=%s | motoboy=%s | valor=%s",
                rdo_id, consolidado["cliente_nome"], consolidado["data_str"],
                consolidado["status_final"], consolidado["motoboy_final"], consolidado["valor_formatado"])
    return True, None


def criar_chat(consolidado):
    rdo_id = consolidado["rdo_id"]

    if rdo_id in CHATS_EXISTENTES:
        logger.info("Chat já existente para %s, pulando criação.", rdo_id)
        return True, None

    payload = {
        "action": "criarchat",
        "apiKey": API_KEY,
        "id": gerar_id_curto(),
        "pedido_id": rdo_id,
        "id_cliente": consolidado["id_cliente"],
        "remetente": "SISTEMA",
        "mensagem": consolidado["texto_chat"],
        "texto": consolidado["texto_chat"],
        "data": consolidado["data_str"],
        "hora": consolidado["hora_str"],
    }

    try:
        resultado = post(payload)
    except ErroApi as exc:
        logger.error("Exceção ao criar chat do pedido %s: %s", rdo_id, exc)
        return False, str(exc)

    if not resultado or resultado.get("status") != "success":
        detalhe = f"resposta={resultado!r}"
        logger.error("Falha ao criar chat do pedido %s: %s", rdo_id, detalhe)
        return False, detalhe

    CHATS_EXISTENTES.add(rdo_id)
    logger.info("Chat criado para o pedido %s.", rdo_id)
    return True, None


def criar_financeiro(consolidado):
    rdo_id = consolidado["rdo_id"]
    motoboy_final = consolidado["motoboy_final"]

    colaborador_id = COLABORADORES.get(motoboy_final)
    if not colaborador_id:
        logger.warning("Financeiro %s: colaborador '%s' não encontrado no mapa.", rdo_id, motoboy_final)

    payload = {
        "action": "addfinanceiro",
        "apiKey": API_KEY,
        "id": gerar_id_curto(),
        "id_pedido": rdo_id,
        "colaborador_id": colaborador_id or "",
        "data": consolidado["data_str"],
        "tipo": TIPO_FINANCEIRO_PADRAO,
        "descricao": consolidado["descricao_final"],
        "cliente": consolidado["cliente_nome"],
        "motoboy": motoboy_final,
        "colaborador": motoboy_final,
        "solicitante": consolidado["solicitante"],
        "vlr_servico": consolidado["valor_formatado"],
        "valor": consolidado["valor_formatado"],
        "observacao": consolidado["observacao"],
        "situacao": "PAGO",
    }

    try:
        resultado = post(payload)
    except ErroApi as exc:
        logger.error("Exceção ao lançar financeiro do pedido %s: %s", rdo_id, exc)
        return False, str(exc)

    if not resultado or resultado.get("status") != "success":
        detalhe = f"resposta={resultado!r}"
        logger.error("Falha ao lançar financeiro do pedido %s: %s", rdo_id, detalhe)
        return False, detalhe

    logger.info("Financeiro lançado: %s | data=%s | cliente=%s | motoboy=%s | tipo=%s | valor=%s",
                rdo_id, consolidado["data_str"], consolidado["cliente_nome"],
                motoboy_final, TIPO_FINANCEIRO_PADRAO, consolidado["valor_formatado"])
    return True, None


def _tratar_interrupcao(signum, frame):
    logger.critical("Execução interrompida pelo usuário (SIGINT).")
    raise SystemExit(1)


signal.signal(signal.SIGINT, _tratar_interrupcao)


def main():
    global CLIENTES, COLABORADORES, RDOS_EXISTENTES, RDO_SEQ, CHATS_EXISTENTES

    COLABORADORES = carregar_colaboradores()
    CLIENTES = carregar_clientes()
    RDOS_EXISTENTES, RDO_SEQ = carregar_rdos_existentes()
    CHATS_EXISTENTES = carregar_chats_existentes()

    pedidos = extrair_pedidos_brutos(DADOS_BRUTOS)
    total_pedidos = len(pedidos)

    inseridos = 0
    ignorados = 0
    clientes_criados = 0
    pedidos_sem_chat = 0
    pedidos_sem_financeiro = 0
    erros_detalhados = []

    for indice, pedido in enumerate(pedidos, start=1):
        rdo_id = None
        try:
            nome_cliente = pedido["cliente_nome"]
            if not nome_cliente:
                ignorados += 1
                erros_detalhados.append((indice, "SEM_CLIENTE_PAGANTE", pedido["detalhes"][:80]))
                continue

            existia = nome_cliente in CLIENTES
            try:
                id_cliente = garantir_cliente(nome_cliente, responsavel=pedido["solicitante"])
            except Exception as exc:
                id_cliente = None
                erros_detalhados.append((indice, "EXCECAO_GARANTIR_CLIENTE", f"{nome_cliente} | {exc}"))
                logger.error("Exceção não tratada ao garantir cliente '%s': %s", nome_cliente, exc)
            time.sleep(INTERVALO_ENTRE_REQUISICOES)

            if not id_cliente:
                ignorados += 1
                erros_detalhados.append((indice, "CLIENTE_NAO_CRIADO", nome_cliente))
                continue

            if not existia:
                clientes_criados += 1

            motoboy_final, observacao = definir_colaborador()
            rdo_id = proximo_rdo_id()

            consolidado = montar_dados_consolidados(rdo_id, pedido, id_cliente, motoboy_final, observacao)

            try:
                pedido_ok, erro_pedido = criar_pedido(consolidado)
            except Exception as exc:
                pedido_ok, erro_pedido = False, str(exc)
                logger.error("Exceção não tratada ao criar pedido %s: %s", rdo_id, exc)

            if not pedido_ok:
                ignorados += 1
                erros_detalhados.append((indice, "FALHA_CRIAR_PEDIDO", f"{rdo_id} | {erro_pedido}"))
                time.sleep(INTERVALO_ENTRE_REQUISICOES)
                continue
            time.sleep(INTERVALO_ENTRE_REQUISICOES)

            try:
                chat_ok, erro_chat = criar_chat(consolidado)
            except Exception as exc:
                chat_ok, erro_chat = False, str(exc)
                logger.error("Exceção não tratada ao criar chat do pedido %s: %s", rdo_id, exc)

            if not chat_ok:
                pedidos_sem_chat += 1
                erros_detalhados.append((indice, "FALHA_CRIAR_CHAT", f"{rdo_id} | {erro_chat}"))
            time.sleep(INTERVALO_ENTRE_REQUISICOES)

            try:
                financeiro_ok, erro_financeiro = criar_financeiro(consolidado)
            except Exception as exc:
                financeiro_ok, erro_financeiro = False, str(exc)
                logger.error("Exceção não tratada ao criar financeiro do pedido %s: %s", rdo_id, exc)
            time.sleep(INTERVALO_ENTRE_REQUISICOES)

            if not financeiro_ok:
                pedidos_sem_financeiro += 1
                erros_detalhados.append((indice, "FALHA_CRIAR_FINANCEIRO", f"{rdo_id} | {erro_financeiro}"))

            inseridos += 1

        except Exception as exc:
            ignorados += 1
            trace = traceback.format_exc()
            erros_detalhados.append((indice, "EXCECAO_NAO_TRATADA", f"rdo={rdo_id} | {exc} | {trace}"))
            logger.critical("Erro não tratado no pedido %d (rdo=%s): %s\n%s", indice, rdo_id, exc, trace)
            continue

        if indice % 20 == 0 or indice == total_pedidos:
            logger.info("Progresso: %d/%d", indice, total_pedidos)

    logger.info(
        "Concluído. Pedidos: %d | Clientes novos: %d | Ignorados: %d | Sem chat: %d | Sem financeiro: %d",
        inseridos, clientes_criados, ignorados, pedidos_sem_chat, pedidos_sem_financeiro,
    )

    if erros_detalhados:
        logger.error("=== RELATÓRIO DETALHADO DE ERROS (%d) ===", len(erros_detalhados))
        for idx, tipo, detalhe in erros_detalhados:
            logger.error("Pedido %d | %s | %s", idx, tipo, detalhe)

    if CLIENTES_PENDENTES:
        logger.warning("Clientes pendentes de CADASTRO MANUAL: %s", sorted(CLIENTES_PENDENTES))


if __name__ == "__main__":
    try:
        main()
    except ErroFatalGeracao as exc:
        logger.critical("Erro fatal na geração de dados: %s", exc)
        sys.exit(1)
    except Exception as exc:
        logger.critical("Erro fatal não tratado: %s\n%s", exc, traceback.format_exc())
        sys.exit(1)
