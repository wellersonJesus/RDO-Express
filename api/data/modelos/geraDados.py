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

from dadoBruto import DADOS_BRUTOS


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
logger = logging.getLogger("geraDados")

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

MOTOBOYS_FIXOS = {"AUANDER", "IGOR", "EMERSON"}

CLIENTES = {}
COLABORADORES = {}
CLIENTES_PENDENTES = set()

RDOS_EXISTENTES = set()
RDO_SEQ = 0

STATUS_CLIENTE_PADRAO = "TRUE"
STATUS_PEDIDO_PADRAO = "CONCLUIDO"
TIPO_FINANCEIRO_PADRAO = "RECEITA"

RDO_PATTERN = re.compile(r"^RDO0*(\d+)$", re.IGNORECASE)
HORA_STRICT_PATTERN = re.compile(r"(\d{1,2}):(\d{2})")

RDO_SEQ_MINIMO = 0

PAGAMENTO_SEMANAL = [
    "VAL FORTUNATO", "MARIA PITANGA", "IN CLOSET", "CACAL SHOW", "OPIMINAS",
    "BRENO", "JOSI FRAGA", "MIMA-ME", "NATU PET", "MAURICIO", "JESSICA CESTA",
]
PAGAMENTO_QUINZENAL = ["TELECOM", "AMMI BELVEDERE", "ROSA DALIA"]
PAGAMENTO_MENSAL = ["BASIQUE", "BETE PLURAL", "FFASHION", "ELISA STHANIS"]

CAMPOS_LINHA_MINIMO = 9
CAMPOS_LINHA_TOTAL = 13


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
    ids = set()
    try:
        resultado = post({"action": "getpedidos", "apiKey": API_KEY})
        dados = _extrair_lista_dados(resultado, "getpedidos")
        for item in dados:
            rdo_id = str(item.get("id", "")).strip().upper()
            if rdo_id:
                ids.add(rdo_id)
    except ErroApi as exc:
        logger.error("Falha ao buscar pedidos existentes na API: %s. Prosseguindo apenas com o piso fixo.", exc)
    except ErroFatalGeracao as exc:
        logger.error("Resposta inesperada ao buscar pedidos existentes: %s. Prosseguindo apenas com o piso fixo.", exc)

    logger.info(
        "Pedidos existentes localizados na API: %d | Sequência FORÇADA a partir de RDO%03d (próximo pedido = RDO%03d).",
        len(ids), RDO_SEQ_MINIMO, RDO_SEQ_MINIMO + 1
    )
    return ids, RDO_SEQ_MINIMO


def proximo_rdo_id():
    global RDO_SEQ
    while True:
        RDO_SEQ += 1
        candidato = f"RDO{RDO_SEQ:03d}"
        if candidato not in RDOS_EXISTENTES:
            RDOS_EXISTENTES.add(candidato)
            return candidato


def carregar_colaboradores():
    try:
        resultado = post({"action": "getcolaboradores", "apiKey": API_KEY})
        dados = _extrair_lista_dados(resultado, "getcolaboradores")
    except (ErroApi, ErroFatalGeracao) as exc:
        logger.critical("Falha crítica ao carregar colaboradores: %s", exc)
        raise ErroFatalGeracao(f"Não foi possível carregar colaboradores: {exc}") from exc

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
    try:
        resultado = post({"action": "getclientes", "apiKey": API_KEY})
        dados = _extrair_lista_dados(resultado, "getclientes")
    except (ErroApi, ErroFatalGeracao) as exc:
        logger.critical("Falha crítica ao carregar clientes: %s", exc)
        raise ErroFatalGeracao(f"Não foi possível carregar clientes: {exc}") from exc

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


def garantir_cliente(nome_cliente):
    nome_upper = (nome_cliente or "").strip().upper()
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
        "responsavel": "",
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


def definir_prioridade(endereco):
    end = (endereco or "").upper()
    if "URGENTE" in end or "PRIORIDADE" in end:
        return "Urgente"
    return "Normal"


def parse_valor(valor_str):
    if not valor_str:
        return 0.0
    limpo = str(valor_str).replace("R$", "").strip().replace(".", "").replace(",", ".")
    try:
        return float(limpo)
    except ValueError as exc:
        logger.error("Valor inválido não pôde ser convertido: '%s' -> %s", valor_str, exc)
        return 0.0


def formatar_valor(valor_str):
    valor = parse_valor(valor_str)
    return f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def formatar_valor_rs(valor_str):
    return f"R$ {formatar_valor(valor_str)}"


def definir_colaborador(motoboy_raw):
    nome = (motoboy_raw or "").strip().upper()
    if nome in MOTOBOYS_FIXOS:
        return nome, ""
    if nome:
        return "GRUPO", f"Grupo - {nome}"
    return "GRUPO", ""


def parse_linha(linha):
    campos = [c.strip() for c in linha.rstrip("\n").split("\t")]
    if not campos:
        logger.error("Linha vazia após split: %r", linha)
        return None
    if campos[0] == "" or campos[0].isdigit():
        campos = campos[1:]
    if len(campos) < CAMPOS_LINHA_MINIMO:
        logger.error("Linha com campos insuficientes (%d < %d): %r", len(campos), CAMPOS_LINHA_MINIMO, linha)
        return None
    while len(campos) < CAMPOS_LINHA_TOTAL:
        campos.append("")
    return {
        "data_lancamento": campos[0],
        "email": campos[1],
        "data_pedido": campos[2],
        "cliente_nome": campos[3].upper(),
        "solicitante": campos[4],
        "tipo_servico": campos[5].upper(),
        "endereco": campos[6],
        "valor_corrida": campos[7],
        "motoboy": campos[8],
        "observacao_bruta": campos[9],
        "telefone": campos[10],
        "distancia_km": campos[11],
        "tempo_min": campos[12],
    }


def normalizar_data(parte_data):
    if not parte_data:
        return ""
    for formato in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(parte_data, formato).strftime("%d/%m/%Y")
        except ValueError:
            continue
    logger.warning("Data em formato não reconhecido: '%s'", parte_data)
    return parte_data


def normalizar_hora(parte_hora):
    if not parte_hora:
        return ""
    return somente_hora(parte_hora) if HORA_STRICT_PATTERN.search(parte_hora) else ""


def extrair_data_hora(campo_bruto):
    campo = (campo_bruto or "").strip()
    if not campo:
        return "", ""
    partes = campo.split(" ")
    data_str = normalizar_data(partes[0].strip())
    hora_str = normalizar_hora(partes[1].strip()) if len(partes) > 1 else ""
    return data_str, hora_str


def separar_data_hora(dados):
    data_ped, hora_ped = extrair_data_hora(dados["data_pedido"])
    data_lanc, hora_lanc = extrair_data_hora(dados["data_lancamento"])

    for data_c, hora_c in ((data_ped, hora_ped), (data_lanc, hora_lanc)):
        if hora_c and hora_c != "00:00":
            return data_c, hora_c

    if data_ped:
        return data_ped, hora_ped or "00:00"
    if data_lanc:
        return data_lanc, hora_lanc or "00:00"

    logger.warning("Nenhuma data válida encontrada nos dados: %s", dados)
    return "", "00:00"


def montar_texto_chat(rdo_id, dados):
    solicitante = dados["solicitante"] or "N/D"
    telefone = dados.get("telefone") or "N/D"
    tipo_servico = dados["tipo_servico"] or "N/D"
    origem = dados["cliente_nome"] or "N/D"
    destino = dados["endereco"] or "N/D"

    distancia_km = dados.get("distancia_km") or "-"
    tempo_min = dados.get("tempo_min") or "-"
    valor = formatar_valor(dados["valor_corrida"]) if dados["valor_corrida"] else "-"

    linhas = [
        f"📦 N.SERVIÇO: {rdo_id}",
        f"👤 : {solicitante} 📞 : {telefone}",
        f"📦 : {tipo_servico}",
        "📍 ROTAS:",
        f"1. De: {origem} | Para: {destino}.",
        f"🛣️ {distancia_km} km ⏱️ {tempo_min}min 💰 R$ {valor}",
    ]
    return "\n".join(linhas)


def montar_descricao_financeiro(dados):
    tipo_servico = dados["tipo_servico"] or "ENTREGA"
    cliente_nome = dados["cliente_nome"] or ""
    endereco = dados["endereco"] or ""

    partes = [tipo_servico]
    if cliente_nome:
        partes.append(f"de {cliente_nome}")
    if endereco:
        partes.append(f"para {endereco}")

    return " ".join(partes).strip()


def montar_dados_consolidados(rdo_id, dados, id_cliente, motoboy_final, observacao):
    data_str, hora_str = separar_data_hora(dados)
    hora_str = somente_hora(hora_str)

    if not data_str:
        data_str = datetime.now().strftime("%d/%m/%Y")
        logger.warning("RDO %s: data não encontrada nos dados brutos. Usando data atual: %s", rdo_id, data_str)

    tipo_servico = dados["tipo_servico"] or "ENTREGA"
    cliente_nome = dados["cliente_nome"] or ""
    endereco_para = dados["endereco"] or ""
    solicitante = dados["solicitante"] or ""

    status_final = STATUS_PEDIDO_PADRAO
    descricao_final = montar_descricao_financeiro(dados)
    texto_chat = montar_texto_chat(rdo_id, dados)
    valor_rs = formatar_valor_rs(dados["valor_corrida"])

    return {
        "rdo_id": rdo_id,
        "id_cliente": id_cliente,
        "cliente_nome": cliente_nome,
        "solicitante": solicitante,
        "motoboy_final": motoboy_final,
        "observacao": observacao or dados["observacao_bruta"],
        "data_str": data_str,
        "hora_str": hora_str,
        "status_final": status_final,
        "descricao_final": descricao_final,
        "tipo_servico": tipo_servico,
        "endereco_para": endereco_para,
        "texto_chat": texto_chat,
        "valor_rs": valor_rs,
    }


def criar_pedido(consolidado):
    rdo_id = consolidado["rdo_id"]

    payload = {
        "action": "criarpedido",
        "apiKey": API_KEY,
        "id": rdo_id,
        "id_cliente": consolidado["id_cliente"],
        "solicitante": consolidado["solicitante"],
        "contato": "",
        "data": consolidado["data_str"],
        "horario": consolidado["hora_str"],
        "mercadoria": consolidado["tipo_servico"],
        "de": consolidado["cliente_nome"],
        "para": consolidado["endereco_para"],
        "retorno": "NÃO",
        "prioridade": definir_prioridade(consolidado["endereco_para"]),
        "valor_corrida": consolidado["valor_rs"],
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

    logger.info("Pedido criado: %s | cliente=%s | data=%s | status=%s | motoboy=%s",
                rdo_id, consolidado["cliente_nome"], consolidado["data_str"],
                consolidado["status_final"], consolidado["motoboy_final"])
    return True, None


def criar_chat(consolidado):
    rdo_id = consolidado["rdo_id"]

    payload = {
        "action": "criarchat",
        "apiKey": API_KEY,
        "id": gerar_id_curto(),
        "id_cliente": consolidado["id_cliente"],
        "pedido_id": rdo_id,
        "texto": consolidado["texto_chat"],
        "hora": consolidado["hora_str"],
        "data": consolidado["data_str"],
        "finalizado": "TRUE",
    }
    try:
        resultado = post(payload)
    except ErroApi as exc:
        logger.error("Exceção ao lançar chat do pedido %s: %s", rdo_id, exc)
        return False, str(exc)

    if not resultado or resultado.get("status") != "success":
        detalhe = f"resposta={resultado!r}"
        logger.error("Falha ao lançar chat do pedido %s: %s", rdo_id, detalhe)
        return False, detalhe

    logger.info("Chat lançado: %s | id_cliente=%s | data=%s | hora=%s",
                rdo_id, consolidado["id_cliente"], consolidado["data_str"], consolidado["hora_str"])
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
        "colaborador_id": colaborador_id or "",
        "id_pedido": rdo_id,
        "data": consolidado["data_str"],
        "tipo": TIPO_FINANCEIRO_PADRAO,
        "descricao": consolidado["descricao_final"],
        "motoboy": motoboy_final,
        "vlr_servico": consolidado["valor_rs"],
        "colaborador": motoboy_final,
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

    logger.info("Financeiro lançado: %s | data=%s | motoboy=%s | tipo=%s | valor=%s",
                rdo_id, consolidado["data_str"], motoboy_final, TIPO_FINANCEIRO_PADRAO, consolidado["valor_rs"])
    return True, None


def _tratar_interrupcao(signum, frame):
    logger.critical("Execução interrompida pelo usuário (SIGINT).")
    raise SystemExit(1)


signal.signal(signal.SIGINT, _tratar_interrupcao)


def main():
    global CLIENTES, COLABORADORES, RDOS_EXISTENTES, RDO_SEQ

    COLABORADORES = carregar_colaboradores()
    CLIENTES = carregar_clientes()
    RDOS_EXISTENTES, RDO_SEQ = carregar_rdos_existentes()
    RDO_SEQ = RDO_SEQ_MINIMO

    logger.info("Sequência RDO travada em %d. Primeiro pedido desta execução será RDO%03d.", RDO_SEQ, RDO_SEQ + 1)

    linhas = [l for l in DADOS_BRUTOS.split("\n") if l.strip()]
    if not linhas:
        logger.critical("DADOS_BRUTOS está vazio. Nada a processar.")
        raise SystemExit(1)

    inseridos = 0
    ignorados = 0
    clientes_criados = 0
    pedidos_sem_financeiro = 0
    pedidos_sem_chat = 0
    erros_detalhados = []

    total_linhas = len(linhas)

    for indice, linha in enumerate(linhas, start=1):
        rdo_id = None
        try:
            dados = parse_linha(linha)
            if not dados:
                ignorados += 1
                erros_detalhados.append((indice, "PARSE_LINHA_INVALIDA", linha))
                continue

            nome_cliente = dados["cliente_nome"]
            existia = nome_cliente in CLIENTES
            try:
                id_cliente = garantir_cliente(nome_cliente)
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

            motoboy_final, observacao = definir_colaborador(dados["motoboy"])
            rdo_id = proximo_rdo_id()

            consolidado = montar_dados_consolidados(rdo_id, dados, id_cliente, motoboy_final, observacao)

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
            time.sleep(INTERVALO_ENTRE_REQUISICOES)

            if not chat_ok:
                pedidos_sem_chat += 1
                erros_detalhados.append((indice, "FALHA_CRIAR_CHAT", f"{rdo_id} | {erro_chat}"))

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
            logger.critical("Erro não tratado na linha %d (rdo=%s): %s\n%s", indice, rdo_id, exc, trace)
            continue

        if indice % 20 == 0 or indice == total_linhas:
            logger.info("Progresso: %d/%d", indice, total_linhas)

    logger.info(
        "Concluído. Pedidos: %d | Clientes novos: %d | Ignorados: %d | Sem chat: %d | Sem financeiro: %d",
        inseridos, clientes_criados, ignorados, pedidos_sem_chat, pedidos_sem_financeiro,
    )

    if erros_detalhados:
        logger.error("=== RELATÓRIO DETALHADO DE ERROS (%d) ===", len(erros_detalhados))
        for idx, tipo, detalhe in erros_detalhados:
            logger.error("Linha %d | %s | %s", idx, tipo, detalhe)

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
