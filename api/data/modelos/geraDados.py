import os
import time
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

CLIENTES = {}
COLABORADORES = {}
CLIENTES_PENDENTES = set()
COLABORADORES_PENDENTES = set()

RDOS_EXISTENTES = set()
RDO_SEQ = 0

STATUS_CLIENTE_PADRAO = "TRUE"
STATUS_PEDIDO_PADRAO = "CONCLUIDO"
TIPO_FINANCEIRO_PADRAO = "RECEITA"

RDO_PATTERN = re.compile(r"^RDO0*(\d+)$", re.IGNORECASE)
RDO_FIN_PATTERN = re.compile(r"^RDO0*(\d+)-FIN$", re.IGNORECASE)
HORA_STRICT_PATTERN = re.compile(r"(\d{1,2}):(\d{2})")

DATA_BR_PATTERN = re.compile(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})")
DATA_ISO_PATTERN = re.compile(r"(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})")

PADRAO_SOLICITANTE = re.compile(
    r"(?:SOLICITANTE|SOLICITOU|SOL\.?|RESPONS[ÁA]VEL|CONTATO)\s*[:\-]\s*([A-ZÀ-Ú0-9\s\.]{2,60})",
    re.IGNORECASE
)

ULTIMO_RDO_LANCADO = "RDO2395"
FILTRO_DATA_INICIO = "07/07/2026"
FILTRO_DATA_FIM = "14/07/2026"

PAGAMENTO_SEMANAL = [
    "VAL FORTUNATO", "MARIA PITANGA", "IN CLOSET", "CACAL SHOW", "OPIMINAS",
    "BRENO", "JOSI FRAGA", "MIMA-ME", "NATU PET", "MAURICIO", "JESSICA CESTA",
]
PAGAMENTO_QUINZENAL = ["TELECOM", "AMMI BELVEDERE", "ROSA DALIA"]
PAGAMENTO_MENSAL = ["BASIQUE", "BETE PLURAL", "FFASHION", "ELISA STHANIS"]

CAMPOS_LINHA_TOTAL = 8


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
        logger.error("Falha ao buscar pedidos existentes na API: %s.", exc)
    except ErroFatalGeracao as exc:
        logger.error("Resposta inesperada ao buscar pedidos existentes: %s.", exc)

    logger.info("Pedidos existentes localizados na API: %d.", len(ids))
    return ids


def carregar_maior_rdo_financeiro():
    maior = 0
    maior_id_str = None
    try:
        resultado = post({"action": "getfinanceiro", "apiKey": API_KEY})
        dados = _extrair_lista_dados(resultado, "getfinanceiro")
        for item in dados:
            fin_id = str(item.get("id", "")).strip().upper()
            match = RDO_FIN_PATTERN.match(fin_id)
            if match:
                numero = int(match.group(1))
                if numero > maior:
                    maior = numero
                    maior_id_str = fin_id
    except ErroApi as exc:
        logger.error("Falha ao buscar tabela financeiro na API: %s.", exc)
    except ErroFatalGeracao as exc:
        logger.error("Resposta inesperada ao buscar tabela financeiro: %s.", exc)

    if maior_id_str:
        logger.info("Maior RDO-FIN localizado na tabela financeiro: %s.", maior_id_str)
    else:
        logger.info("Nenhum RDO-FIN localizado na tabela financeiro.")

    return maior


def conferir_ultimo_rdo_com_financeiro(rdo_seq_base, maior_rdo_financeiro):
    if maior_rdo_financeiro == 0:
        logger.info("Sem RDO-FIN na tabela financeiro para comparação. Seguindo com valor manual (RDO%03d).", rdo_seq_base)
        return

    if maior_rdo_financeiro == rdo_seq_base:
        logger.info(
            "OK: ULTIMO_RDO_LANCADO (RDO%03d) confere com o maior RDO-FIN da tabela financeiro (RDO%03d).",
            rdo_seq_base, maior_rdo_financeiro
        )
    elif maior_rdo_financeiro > rdo_seq_base:
        logger.warning(
            "ATENCAO: a tabela financeiro ja possui RDO%03d-FIN, mas ULTIMO_RDO_LANCADO esta definido como RDO%03d.",
            maior_rdo_financeiro, rdo_seq_base
        )
    else:
        logger.warning(
            "ATENCAO: ULTIMO_RDO_LANCADO esta definido como RDO%03d, mas o maior RDO-FIN encontrado e RDO%03d.",
            rdo_seq_base, maior_rdo_financeiro
        )


def determinar_rdo_seq_inicial(rdos_existentes):
    if ULTIMO_RDO_LANCADO:
        match = RDO_PATTERN.match(ULTIMO_RDO_LANCADO.strip().upper())
        if match:
            base = int(match.group(1))
            logger.info(
                "Continuidade manual definida: último lançado = %s -> próxima geração inicia em RDO%03d.",
                ULTIMO_RDO_LANCADO, base + 1
            )
            return base
        logger.warning(
            "ULTIMO_RDO_LANCADO '%s' não corresponde ao padrão RDO### — usando autodetecção.",
            ULTIMO_RDO_LANCADO
        )

    maior = 0
    for rdo_id in rdos_existentes:
        match = RDO_PATTERN.match(rdo_id)
        if match:
            numero = int(match.group(1))
            if numero > maior:
                maior = numero

    logger.info("Continuidade automática (fallback): maior RDO existente na API = RDO%03d.", maior)
    return maior


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


def garantir_cliente(nome_cliente, responsavel=""):
    nome_upper = (nome_cliente or "").strip().upper()
    if not nome_upper:
        logger.error("Nome de cliente vazio recebido em garantir_cliente().")
        return None
    if nome_upper in CLIENTES:
        return CLIENTES[nome_upper]
    if nome_upper in CLIENTES_PENDENTES:
        logger.warning("Cliente '%s' está na lista de pendentes.", nome_upper)
        return None

    pagamento_identificado = determinar_pagamento_cliente(nome_upper)
    responsavel_final = (responsavel or "").strip()

    payload = {
        "action": "criarcliente",
        "apiKey": API_KEY,
        "username": nome_upper,
        "responsavel": responsavel_final,
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
        logger.info(
            "Cliente criado: %s (id=%s, pagamento=%s, responsavel=%s)",
            nome_upper, novo_id, pagamento_identificado, responsavel_final
        )
        return novo_id

    CLIENTES_PENDENTES.add(nome_upper)
    logger.error("Falha ao cadastrar cliente '%s': resposta=%s", nome_upper, resultado)
    return None


def definir_prioridade(endereco, observacao):
    texto = f"{endereco or ''} {observacao or ''}".upper()
    if "URGENTE" in texto or "PRIORIDADE" in texto:
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


def extrair_telefone(observacao_bruta):
    if not observacao_bruta:
        return ""
    match = re.search(r"(\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4})", str(observacao_bruta))
    return match.group(1).strip() if match else ""


def extrair_solicitante(observacao_bruta, cliente_nome):
    if observacao_bruta:
        match = PADRAO_SOLICITANTE.search(str(observacao_bruta))
        if match:
            nome_extraido = match.group(1).strip().rstrip(".")
            nome_extraido = re.sub(r"\s{2,}", " ", nome_extraido)
            if nome_extraido:
                return nome_extraido.upper()

    if cliente_nome and cliente_nome != "-":
        return cliente_nome.upper()

    logger.warning("Solicitante não identificado (observacao=%r, cliente=%r).", observacao_bruta, cliente_nome)
    return "N/A"


def definir_colaborador(motoboy_raw):
    nome = (motoboy_raw or "").strip().upper()
    if not nome or nome == "-":
        logger.warning("Campo 'colaborador' vazio na linha bruta. Motoboy será registrado como 'N/A'.")
        return "N/A"

    if nome not in COLABORADORES:
        COLABORADORES_PENDENTES.add(nome)
        logger.warning(
            "Colaborador '%s' não encontrado no cadastro (getcolaboradores). "
            "O nome será gravado normalmente no pedido, mas o financeiro pode ficar sem colaborador_id vinculado.",
            nome
        )

    return nome


def parse_linha(linha):
    campos = [c.strip() for c in linha.rstrip("\n").split("\t")]
    if len(campos) < CAMPOS_LINHA_TOTAL:
        logger.error("Linha com campos insuficientes (%d < %d): %r", len(campos), CAMPOS_LINHA_TOTAL, linha)
        return None
    while len(campos) < CAMPOS_LINHA_TOTAL:
        campos.append("")

    hora_bruta = campos[0]
    data_bruta = campos[1]
    cliente_nome = campos[2].upper() if campos[2] and campos[2] != "-" else "-"
    motoboy_raw = campos[3]
    tipo_servico = campos[4].upper()
    endereco_para = campos[5]
    valor_corrida = campos[6]
    observacao_bruta = campos[7]

    dados = {
        "hora_bruta": hora_bruta,
        "data_bruta": data_bruta,
        "cliente_nome": cliente_nome,
        "motoboy_raw": motoboy_raw,
        "tipo_servico": tipo_servico,
        "endereco_para": endereco_para,
        "valor_corrida": valor_corrida,
        "observacao_bruta": observacao_bruta,
        "telefone": extrair_telefone(observacao_bruta),
    }
    dados["solicitante"] = extrair_solicitante(observacao_bruta, cliente_nome)
    return dados


def extrair_data(campo_bruto):
    if not campo_bruto:
        return ""
    texto = str(campo_bruto).strip()

    match_br = DATA_BR_PATTERN.search(texto)
    if match_br:
        dia, mes, ano = match_br.groups()
        ano = int(ano)
        if ano < 100:
            ano += 2000
        try:
            return datetime(ano, int(mes), int(dia)).strftime("%d/%m/%Y")
        except ValueError:
            pass

    match_iso = DATA_ISO_PATTERN.search(texto)
    if match_iso:
        ano, mes, dia = match_iso.groups()
        try:
            return datetime(int(ano), int(mes), int(dia)).strftime("%d/%m/%Y")
        except ValueError:
            pass

    logger.warning("Nenhum padrão de data reconhecido em: '%s'", texto)
    return ""


def separar_data_hora(dados):
    data_servico = extrair_data(dados["data_bruta"])
    hora_final = somente_hora(dados["hora_bruta"])

    if not data_servico:
        logger.warning(
            "Campo 'data' sem valor reconhecível (bruto: %r). Registro será marcado sem data.",
            dados["data_bruta"]
        )
        return "", hora_final

    return data_servico, hora_final


def _data_para_datetime(data_str):
    try:
        return datetime.strptime(data_str, "%d/%m/%Y")
    except (ValueError, TypeError):
        return None


def linha_dentro_do_filtro(dados):
    if not FILTRO_DATA_INICIO and not FILTRO_DATA_FIM:
        return True

    data_str, _ = separar_data_hora(dados)
    data_dt = _data_para_datetime(data_str)
    if not data_dt:
        return False

    inicio_dt = _data_para_datetime(FILTRO_DATA_INICIO) if FILTRO_DATA_INICIO else None
    fim_dt = _data_para_datetime(FILTRO_DATA_FIM) if FILTRO_DATA_FIM else None

    if inicio_dt and data_dt < inicio_dt:
        return False
    if fim_dt and data_dt > fim_dt:
        return False
    return True


def montar_descricao_financeiro(dados):
    tipo_servico = dados["tipo_servico"] or "ENTREGA"
    cliente_nome = dados["cliente_nome"] or ""
    endereco_para = dados["endereco_para"] or ""

    partes = [tipo_servico]
    if cliente_nome and cliente_nome != "-":
        partes.append(f"de {cliente_nome}")
    if endereco_para:
        partes.append(f"para {endereco_para}")

    return " ".join(partes).strip()


def montar_dados_consolidados(rdo_id, dados, id_cliente, motoboy_final):
    data_str, hora_str = separar_data_hora(dados)

    if not data_str:
        logger.error(
            "RDO %s: 'data' não pôde ser extraída do valor bruto %r. Pedido será lançado SEM DATA.",
            rdo_id, dados["data_bruta"]
        )

    tipo_servico = dados["tipo_servico"] or "ENTREGA"
    cliente_nome = dados["cliente_nome"] or ""
    endereco_para = dados["endereco_para"] or ""
    observacao = dados["observacao_bruta"] or ""
    solicitante = dados["solicitante"] or "N/A"

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
        "descricao_final": montar_descricao_financeiro(dados),
        "tipo_servico": tipo_servico,
        "endereco_para": endereco_para,
        "valor_rs": formatar_valor_rs(dados["valor_corrida"]),
        "telefone": dados.get("telefone") or "",
    }


def criar_pedido(consolidado):
    rdo_id = consolidado["rdo_id"]

    payload = {
        "action": "criarpedido",
        "apiKey": API_KEY,
        "id": rdo_id,
        "id_cliente": consolidado["id_cliente"],
        "solicitante": consolidado["solicitante"],
        "contato": consolidado["telefone"],
        "data": consolidado["data_str"],
        "horario": consolidado["hora_str"],
        "mercadoria": consolidado["tipo_servico"],
        "de": consolidado["cliente_nome"],
        "para": consolidado["endereco_para"],
        "retorno": "NÃO",
        "prioridade": definir_prioridade(consolidado["endereco_para"], consolidado["observacao"]),
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

    logger.info(
        "Pedido criado: %s | cliente=%s | data=%s | hora=%s | status=%s | motoboy=%s | solicitante=%s",
        rdo_id, consolidado["cliente_nome"], consolidado["data_str"], consolidado["hora_str"],
        consolidado["status_final"], consolidado["motoboy_final"], consolidado["solicitante"]
    )
    return True, None


def criar_financeiro(consolidado):
    rdo_id = consolidado["rdo_id"]
    motoboy_final = consolidado["motoboy_final"]

    colaborador_id = COLABORADORES.get(motoboy_final)
    if not colaborador_id:
        logger.warning("Financeiro %s: colaborador '%s' não encontrado no mapa.", rdo_id, motoboy_final)

    payload = {
        "action": "criarfinanceiro",
        "apiKey": API_KEY,
        "id": rdo_id + "-FIN",
        "colaborador_id": colaborador_id or "",
        "id_pedido": rdo_id,
        "data": consolidado["data_str"],
        "tipo": TIPO_FINANCEIRO_PADRAO,
        "descricao": consolidado["descricao_final"],
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

    logger.info(
        "Financeiro lançado: %s | data=%s | colaborador=%s | tipo=%s | valor=%s",
        rdo_id, consolidado["data_str"], motoboy_final, TIPO_FINANCEIRO_PADRAO, consolidado["valor_rs"]
    )
    return True, None


def _tratar_interrupcao(signum, frame):
    logger.critical("Execução interrompida pelo usuário (SIGINT).")
    raise SystemExit(1)


signal.signal(signal.SIGINT, _tratar_interrupcao)


def main():
    global CLIENTES, COLABORADORES, RDOS_EXISTENTES, RDO_SEQ

    COLABORADORES = carregar_colaboradores()
    CLIENTES = carregar_clientes()
    RDOS_EXISTENTES = carregar_rdos_existentes()
    RDO_SEQ = determinar_rdo_seq_inicial(RDOS_EXISTENTES)

    maior_rdo_financeiro = carregar_maior_rdo_financeiro()
    conferir_ultimo_rdo_com_financeiro(RDO_SEQ, maior_rdo_financeiro)

    logger.info("Sequência RDO travada em %d. Primeiro pedido desta execução será RDO%03d.", RDO_SEQ, RDO_SEQ + 1)
    logger.info("Filtro de período ativo: início=%s | fim=%s", FILTRO_DATA_INICIO or "sem limite", FILTRO_DATA_FIM or "sem limite")

    todas_linhas = [l for l in DADOS_BRUTOS.split("\n") if l.strip()]
    if not todas_linhas:
        logger.critical("DADOS_BRUTOS está vazio. Nada a processar.")
        raise SystemExit(1)

    linhas_filtradas = []
    fora_do_filtro = 0

    for linha in todas_linhas:
        dados_temp = parse_linha(linha)
        if not dados_temp:
            continue
        if linha_dentro_do_filtro(dados_temp):
            linhas_filtradas.append(linha)
        else:
            fora_do_filtro += 1

    logger.info(
        "Linhas totais na base: %d | Dentro do filtro: %d | Fora do filtro (ignoradas): %d",
        len(todas_linhas), len(linhas_filtradas), fora_do_filtro
    )

    if not linhas_filtradas:
        logger.critical("Nenhuma linha dentro do período informado (%s a %s). Verifique o filtro.", FILTRO_DATA_INICIO, FILTRO_DATA_FIM)
        raise SystemExit(1)

    inseridos = 0
    ignorados = 0
    clientes_criados = 0
    pedidos_sem_financeiro = 0
    pedidos_sem_data = 0
    erros_detalhados = []

    total_linhas = len(linhas_filtradas)

    for indice, linha in enumerate(linhas_filtradas, start=1):
        rdo_id = None
        try:
            dados = parse_linha(linha)
            if not dados:
                ignorados += 1
                erros_detalhados.append((indice, "PARSE_LINHA_INVALIDA", linha))
                continue

            nome_cliente = dados["cliente_nome"]
            if nome_cliente == "-":
                nome_cliente = dados["tipo_servico"] or "N/A"
                dados["cliente_nome"] = nome_cliente

            existia = nome_cliente in CLIENTES
            try:
                id_cliente = garantir_cliente(nome_cliente, dados["solicitante"])
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

            motoboy_final = definir_colaborador(dados["motoboy_raw"])
            rdo_id = proximo_rdo_id()

            consolidado = montar_dados_consolidados(rdo_id, dados, id_cliente, motoboy_final)

            if not consolidado["data_str"]:
                pedidos_sem_data += 1
                erros_detalhados.append((indice, "SEM_DATA_SERVICO", f"{rdo_id} | bruto={dados['data_bruta']!r}"))

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
        "Concluído. Pedidos: %d | Clientes novos: %d | Ignorados: %d | Sem financeiro: %d | Sem data reconhecida: %d",
        inseridos, clientes_criados, ignorados, pedidos_sem_financeiro, pedidos_sem_data,
    )

    if erros_detalhados:
        logger.error("=== RELATÓRIO DETALHADO DE ERROS (%d) ===", len(erros_detalhados))
        for idx, tipo, detalhe in erros_detalhados:
            logger.error("Linha %d | %s | %s", idx, tipo, detalhe)

    if CLIENTES_PENDENTES:
        logger.warning("Clientes pendentes de CADASTRO MANUAL: %s", sorted(CLIENTES_PENDENTES))

    if COLABORADORES_PENDENTES:
        logger.warning("Colaboradores presentes no bruto mas AUSENTES no cadastro (getcolaboradores): %s", sorted(COLABORADORES_PENDENTES))


if __name__ == "__main__":
    try:
        main()
    except ErroFatalGeracao as exc:
        logger.critical("Erro fatal na geração de dados: %s", exc)
        sys.exit(1)
    except Exception as exc:
        logger.critical("Erro fatal não tratado: %s\n%s", exc, traceback.format_exc())
        sys.exit(1)
