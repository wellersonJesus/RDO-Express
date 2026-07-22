import os
import time
import re
import logging
import signal
import sys
import traceback
from datetime import datetime
from pathlib import Path
from collections import Counter, defaultdict

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
CLIENTES_NORMALIZADOS = {}
COLABORADORES = {}
CLIENTES_PENDENTES = set()
COLABORADORES_PENDENTES = set()

RDOS_EXISTENTES = set()
RDO_SEQ = 0

REGISTRO_ERROS = []


def registrar_erro(tipo, detalhe, linha=None, exc=None):
    tb = None
    if exc is not None:
        tb = traceback.format_exc()
    elif sys.exc_info()[0] is not None:
        tb = traceback.format_exc()

    entrada = {
        "tipo": tipo,
        "linha": linha,
        "detalhe": str(detalhe),
        "traceback": tb,
    }
    REGISTRO_ERROS.append(entrada)

    if tb:
        logger.error("[%s] %s | linha=%r\n%s", tipo, detalhe, linha, tb)
    else:
        logger.error("[%s] %s | linha=%r", tipo, detalhe, linha)


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

ULTIMO_RDO_LANCADO = "RDO0000"
FILTRO_DATA_INICIO = "01/06/2026"
FILTRO_DATA_FIM = "21/07/2026"

PAGAMENTO_SEMANAL = [
    "VAL FORTUNATO", "MARIA PITANGA", "IN CLOSET", "CACAL SHOW", "OPIMINAS", "OPMINAS",
    "BRENO", "JOSI FRAGA", "MIMA-ME", "NATU PET", "MAURICIO", "JESSICA CESTA",
]
PAGAMENTO_QUINZENAL = ["TELECOM", "AMMI BELVEDERE", "ROSA DALIA"]
PAGAMENTO_MENSAL = ["BASIQUE", "BETE PLURAL", "FFASHION", "ELISA STHANIS"]

CAMPOS_LINHA_TOTAL = 8

SINONIMOS_MANUAIS = {
    # Opminas
    "OPIMINAS": "OPMINAS",
    "OPENMINAS": "OPMINAS",
    "OPMINAS": "OPMINAS",

    # Maria Pitanga
    "MPITANGA": "MARIAPITANGA",
    "MARIAPITANGA": "MARIAPITANGA",

    # Val Fortunato (aparece corrompido/repetido nos dados brutos)
    "VALFORTUNATO": "VALFORTUNATO",
    "VALFORTUNATOFORTUNATO": "VALFORTUNATO",
    "VALFORTUNATOFORTUNATOFORTUNATO": "VALFORTUNATO",
    "VALFORTUNATOFORTUNATOFORTUNATOFORTUNATO": "VALFORTUNATO",
    "VALFORTUNATOFORTUNATOFORTUNATOFORTUNATOFORTUNATO": "VALFORTUNATO",

    # Elisa Atheniense (várias abreviações)
    "ELISAATHENI": "ELISAATHENIENSE",
    "ELISAATHENIENSE": "ELISAATHENIENSE",
    "ELISAATHENICEARA": "ELISAATHENIENSECEARA",
    "ELISAATHENIENSECEARA": "ELISAATHENIENSECEARA",
    "ELISAATHENIENSESCEARA": "ELISAATHENIENSECEARA",
    "ELISAATHENIENSEBOTANICO": "ELISAATHENIENSEBOTANICO",
    "ELISAATHENIENSEBOTANIICO": "ELISAATHENIENSEBOTANICO",

    # Mima-me
    "MIMAME": "MIMAME",
    "MIMAMES": "MIMAME",

    # Natu Pet
    "NATUPET": "NATUPET",
    "NATUPETS": "NATUPET",

    # FF Fashion
    "FFASHION": "FFFASHION",
    "FFFASHION": "FFFASHION",

    # Cacal Show / Cacau Show
    "CACALSHOW": "CACAUSHOW",
    "CACAUSHOW": "CACAUSHOW",

    # Mauricio (garante consistência de caixa)
    "MAURICIO": "MAURICIO",

    # Tamara / Cpap Tamara
    "TAMARA": "TAMARA",
    "TAMARACAPS": "TAMARACAPS",

    # Kopenhagen
    "KOPENHAGEN": "KOPENHAGEN",

    # S Manoel
    "SMANOEL": "SMANOEL",
    "SAOMANOELINDUSTRIA": "SMANOEL",

    # Cesta
    "CESTA": "CESTA",

    # Basique
    "BASIQUE": "BASIQUE",

    # Rosa Dalia
    "ROSADALIA": "ROSADALIA",

    # In Closet
    "INCLOSET": "INCLOSET",
    "INCLOSED": "INCLOSET",

    # Plural
    "PLURAL": "PLURAL",
    "BETEPLURAL": "BETEPLURAL",
    "BETEPLURALDIAMONDMALL": "BETEPLURALDIAMONDMALL",
}


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
    chave = re.sub(r"[^A-Z0-9]", "", texto)
    return SINONIMOS_MANUAIS.get(chave, chave)


def _normalizar_nome_cliente(nome):
    return _normalizar_nome(nome)


def _corresponde(nome_normalizado, lista):
    for item in lista:
        normalizado_item = _normalizar_nome(item)
        if normalizado_item and (normalizado_item in nome_normalizado or nome_normalizado in normalizado_item):
            return True
    return False


def determinar_pagamento_cliente(nome_cliente):
    try:
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
    except Exception as exc:
        registrar_erro("ERRO_DETERMINAR_PAGAMENTO", f"cliente={nome_cliente!r}: {exc}", exc=exc)
        return "DIÁRIO"


def post(payload, tentativas=MAX_TENTATIVAS_POST):
    ultimo_erro = None
    for tentativa in range(1, tentativas + 1):
        try:
            resp = SESSAO.post(URL, json=payload, timeout=TIMEOUT_CONEXAO)
        except requests.exceptions.Timeout as exc:
            ultimo_erro = exc
            registrar_erro("TIMEOUT_API", f"ação='{payload.get('action')}' tentativa={tentativa}/{tentativas}", exc=exc)
        except requests.RequestException as exc:
            ultimo_erro = exc
            registrar_erro("ERRO_REDE", f"ação='{payload.get('action')}' tentativa={tentativa}/{tentativas} -> {exc}", exc=exc)
        except Exception as exc:
            ultimo_erro = exc
            registrar_erro("ERRO_DESCONHECIDO_POST", f"ação='{payload.get('action')}' tentativa={tentativa}/{tentativas} -> {exc}", exc=exc)
        else:
            if resp.status_code != 200:
                ultimo_erro = ErroApi(payload.get("action"), payload, f"HTTP {resp.status_code}: {resp.text}")
                registrar_erro("HTTP_ERRO", ultimo_erro)
            else:
                try:
                    corpo = resp.json()
                except ValueError as exc:
                    ultimo_erro = ErroApi(payload.get("action"), payload, f"JSON inválido: {resp.text} ({exc})")
                    registrar_erro("JSON_INVALIDO", ultimo_erro, exc=exc)
                else:
                    if isinstance(corpo, dict) and corpo.get("status") == "error":
                        registrar_erro("API_RETORNOU_ERRO", f"ação='{payload.get('action')}' -> {corpo}")
                    return corpo
        if tentativa < tentativas:
            time.sleep(3 * tentativa)
    raise ErroApi(payload.get("action"), payload, str(ultimo_erro))


def somente_hora(valor):
    if not valor:
        return "00:00"
    try:
        match = HORA_STRICT_PATTERN.search(str(valor))
        if not match:
            registrar_erro("HORA_INVALIDA", f"valor bruto={valor!r} sem padrão HH:MM reconhecível")
            return "00:00"
        hora = int(match.group(1))
        minuto = match.group(2)
        if hora > 23:
            registrar_erro("HORA_FORA_DO_RANGE", f"hora={hora} inválida, zerando para 00:{minuto}")
            hora = 0
        return f"{hora:02d}:{minuto}"
    except Exception as exc:
        registrar_erro("ERRO_PROCESSAR_HORA", f"valor={valor!r}: {exc}", exc=exc)
        return "00:00"


def _extrair_lista_dados(resultado, action):
    dados = resultado.get("data") if isinstance(resultado, dict) else resultado
    if not isinstance(dados, list):
        raise ErroFatalGeracao(f"Resposta inesperada em '{action}': esperado list, recebido {type(dados).__name__} -> {resultado!r}")
    return dados


def _buscar_lista(action):
    resultado = post({"action": action, "apiKey": API_KEY})
    return _extrair_lista_dados(resultado, action)


def verificar_ids_duplicados():
    logger.info("Verificando duplicidade de IDs no banco (pedidos e financeiro)...")
    problemas_encontrados = False

    try:
        pedidos = _buscar_lista("getpedidos")
    except (ErroApi, ErroFatalGeracao) as exc:
        registrar_erro("FALHA_BUSCA_PEDIDOS", exc, exc=exc)
        pedidos = []
    except Exception as exc:
        registrar_erro("ERRO_INESPERADO_BUSCA_PEDIDOS", exc, exc=exc)
        pedidos = []

    ids_pedidos = [str(item.get("id", "")).strip().upper() for item in pedidos if item.get("id")]
    contagem_pedidos = Counter(ids_pedidos)
    duplicados_pedidos = {rdo: qtd for rdo, qtd in contagem_pedidos.items() if qtd > 1}

    if duplicados_pedidos:
        problemas_encontrados = True
        for rdo_id, qtd in sorted(duplicados_pedidos.items()):
            registrar_erro("RDO_DUPLICADO", f"ID '{rdo_id}' aparece {qtd}x na tabela pedidos")

    try:
        financeiros = _buscar_lista("getfinanceiro")
    except (ErroApi, ErroFatalGeracao) as exc:
        registrar_erro("FALHA_BUSCA_FINANCEIRO", exc, exc=exc)
        financeiros = []
    except Exception as exc:
        registrar_erro("ERRO_INESPERADO_BUSCA_FINANCEIRO", exc, exc=exc)
        financeiros = []

    ids_financeiro = [str(item.get("id", "")).strip().upper() for item in financeiros if item.get("id")]
    contagem_financeiro = Counter(ids_financeiro)
    duplicados_financeiro = {fin: qtd for fin, qtd in contagem_financeiro.items() if qtd > 1}

    if duplicados_financeiro:
        problemas_encontrados = True
        for fin_id, qtd in sorted(duplicados_financeiro.items()):
            registrar_erro("FIN_DUPLICADO", f"ID '{fin_id}' aparece {qtd}x na tabela financeiro")

    ids_pedidos_sem_sufixo = set(ids_pedidos)
    ids_fin_sem_sufixo = set()
    for fin_id in ids_financeiro:
        match = RDO_FIN_PATTERN.match(fin_id)
        if match:
            ids_fin_sem_sufixo.add(f"RDO{int(match.group(1)):03d}")

    faltando_financeiro = sorted(ids_pedidos_sem_sufixo - ids_fin_sem_sufixo)
    if faltando_financeiro:
        registrar_erro("PEDIDO_SEM_FINANCEIRO", f"pedidos sem financeiro correspondente: {faltando_financeiro}")

    if problemas_encontrados:
        raise ErroFatalGeracao(
            "Foram encontrados IDs duplicados no banco. Corrija/apague os registros duplicados "
            "listados no resumo de erros antes de rodar o geraDados novamente."
        )

    logger.info("Nenhuma duplicidade de ID encontrada. Prosseguindo com a geração.")


def carregar_rdos_existentes():
    ids = set()
    try:
        dados = _buscar_lista("getpedidos")
        for item in dados:
            rdo_id = str(item.get("id", "")).strip().upper()
            if rdo_id:
                ids.add(rdo_id)
    except (ErroApi, ErroFatalGeracao) as exc:
        registrar_erro("FALHA_CARREGAR_RDOS", exc, exc=exc)
    except Exception as exc:
        registrar_erro("ERRO_INESPERADO_CARREGAR_RDOS", exc, exc=exc)

    logger.info("Pedidos existentes localizados na API: %d.", len(ids))
    return ids


def carregar_maior_rdo_financeiro():
    maior = 0
    maior_id_str = None
    try:
        dados = _buscar_lista("getfinanceiro")
        for item in dados:
            fin_id = str(item.get("id", "")).strip().upper()
            match = RDO_FIN_PATTERN.match(fin_id)
            if match:
                numero = int(match.group(1))
                if numero > maior:
                    maior = numero
                    maior_id_str = fin_id
    except (ErroApi, ErroFatalGeracao) as exc:
        registrar_erro("FALHA_CARREGAR_FINANCEIRO", exc, exc=exc)
    except Exception as exc:
        registrar_erro("ERRO_INESPERADO_CARREGAR_FINANCEIRO", exc, exc=exc)

    if maior_id_str:
        logger.info("Maior RDO-FIN localizado na tabela financeiro: %s.", maior_id_str)
    else:
        logger.info("Nenhum RDO-FIN localizado na tabela financeiro.")

    return maior


def _data_para_datetime(data_str):
    try:
        return datetime.strptime(data_str, "%d/%m/%Y")
    except (ValueError, TypeError):
        return None


def carregar_datas_existentes_financeiro():
    datas = set()
    try:
        dados = _buscar_lista("getfinanceiro")
        for item in dados:
            data_dt = _data_para_datetime(str(item.get("data", "")).strip())
            if data_dt:
                datas.add(data_dt.date())
    except (ErroApi, ErroFatalGeracao) as exc:
        registrar_erro("FALHA_CARREGAR_DATAS_FINANCEIRO", exc, exc=exc)
    except Exception as exc:
        registrar_erro("ERRO_INESPERADO_CARREGAR_DATAS_FINANCEIRO", exc, exc=exc)
    logger.info("Datas distintas já lançadas no financeiro: %d.", len(datas))
    return datas


def conferir_ultimo_rdo_com_financeiro(rdo_seq_base, maior_rdo_financeiro):
    if maior_rdo_financeiro == 0:
        logger.info("Sem RDO-FIN na tabela financeiro para comparação. Seguindo com valor manual (RDO%03d).", rdo_seq_base)
        return
    if maior_rdo_financeiro == rdo_seq_base:
        logger.info("OK: ULTIMO_RDO_LANCADO (RDO%03d) confere com maior RDO-FIN (RDO%03d).", rdo_seq_base, maior_rdo_financeiro)
    elif maior_rdo_financeiro > rdo_seq_base:
        registrar_erro("RDO_DESALINHADO", f"financeiro já tem RDO{maior_rdo_financeiro:03d}-FIN, mas ULTIMO_RDO_LANCADO=RDO{rdo_seq_base:03d}")
    else:
        registrar_erro("RDO_DESALINHADO", f"ULTIMO_RDO_LANCADO=RDO{rdo_seq_base:03d}, mas maior RDO-FIN encontrado é RDO{maior_rdo_financeiro:03d}")


def determinar_rdo_seq_inicial(rdos_existentes):
    if ULTIMO_RDO_LANCADO:
        match = RDO_PATTERN.match(ULTIMO_RDO_LANCADO.strip().upper())
        if match:
            base = int(match.group(1))
            logger.info("Continuidade manual: último=%s -> próxima geração inicia em RDO%03d.", ULTIMO_RDO_LANCADO, base + 1)
            return base
        registrar_erro("CONFIG_INVALIDA", f"ULTIMO_RDO_LANCADO '{ULTIMO_RDO_LANCADO}' fora do padrão RDO### — usando autodetecção.")

    maior = 0
    for rdo_id in rdos_existentes:
        match = RDO_PATTERN.match(rdo_id)
        if match:
            numero = int(match.group(1))
            if numero > maior:
                maior = numero

    logger.info("Continuidade automática (fallback): maior RDO existente = RDO%03d.", maior)
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
        dados = _buscar_lista("getcolaboradores")
    except (ErroApi, ErroFatalGeracao) as exc:
        logger.critical("Falha crítica ao carregar colaboradores: %s", exc)
        raise ErroFatalGeracao(f"Não foi possível carregar colaboradores: {exc}") from exc
    except Exception as exc:
        logger.critical("Erro inesperado ao carregar colaboradores: %s\n%s", exc, traceback.format_exc())
        raise ErroFatalGeracao(f"Erro inesperado ao carregar colaboradores: {exc}") from exc

    mapa = {}
    for item in dados:
        try:
            nome = str(item.get("username", "")).strip().upper()
            if not nome:
                registrar_erro("COLABORADOR_SEM_USERNAME", item)
                continue
            colaborador_id = item.get("id")
            if colaborador_id is None:
                registrar_erro("COLABORADOR_SEM_ID", f"'{nome}': {item}")
            mapa[nome] = colaborador_id
        except Exception as exc:
            registrar_erro("ERRO_PROCESSAR_COLABORADOR", f"item={item!r}: {exc}", exc=exc)
    logger.info("Colaboradores carregados: %d", len(mapa))
    return mapa


def carregar_clientes():
    try:
        dados = _buscar_lista("getclientes")
    except (ErroApi, ErroFatalGeracao) as exc:
        logger.critical("Falha crítica ao carregar clientes: %s", exc)
        raise ErroFatalGeracao(f"Não foi possível carregar clientes: {exc}") from exc
    except Exception as exc:
        logger.critical("Erro inesperado ao carregar clientes: %s\n%s", exc, traceback.format_exc())
        raise ErroFatalGeracao(f"Erro inesperado ao carregar clientes: {exc}") from exc

    mapa = {}
    mapa_normalizado = {}

    for item in dados:
        try:
            nome = str(item.get("username", "")).strip().upper()
            if not nome:
                registrar_erro("CLIENTE_SEM_USERNAME", item)
                continue
            cliente_id = item.get("id")
            if cliente_id is None:
                registrar_erro("CLIENTE_SEM_ID", f"'{nome}': {item}")
                continue

            mapa[nome] = cliente_id

            chave_norm = _normalizar_nome_cliente(nome)
            if chave_norm in mapa_normalizado:
                registrar_erro(
                    "CLIENTE_DUPLICADO_POR_GRAFIA",
                    f"'{nome}' (id={cliente_id}) e '{mapa_normalizado[chave_norm][1]}' "
                    f"(id={mapa_normalizado[chave_norm][0]}) normalizam para a mesma chave "
                    f"'{chave_norm}'. Mantendo '{mapa_normalizado[chave_norm][1]}' como canônico."
                )
            else:
                mapa_normalizado[chave_norm] = (cliente_id, nome)
        except Exception as exc:
            registrar_erro("ERRO_PROCESSAR_CLIENTE", f"item={item!r}: {exc}", exc=exc)

    global CLIENTES_NORMALIZADOS
    CLIENTES_NORMALIZADOS = mapa_normalizado

    logger.info("Clientes carregados: %d (chaves normalizadas únicas: %d)", len(mapa), len(mapa_normalizado))
    return mapa


def garantir_cliente(nome_cliente, responsavel=""):
    try:
        nome_upper = (nome_cliente or "").strip().upper()
        if not nome_upper or nome_upper == "-":
            registrar_erro("CLIENTE_NOME_VAZIO", "nome de cliente vazio/inválido recebido em garantir_cliente()")
            return None

        if nome_upper in CLIENTES:
            return CLIENTES[nome_upper]

        chave_norm = _normalizar_nome_cliente(nome_upper)
        if chave_norm in CLIENTES_NORMALIZADOS:
            cliente_id_canonico, nome_canonico = CLIENTES_NORMALIZADOS[chave_norm]
            logger.info("Cliente '%s' associado ao cadastro canônico '%s' (id=%s) via normalização.", nome_upper, nome_canonico, cliente_id_canonico)
            CLIENTES[nome_upper] = cliente_id_canonico
            return cliente_id_canonico

        if nome_upper in CLIENTES_PENDENTES:
            registrar_erro("CLIENTE_PENDENTE_IGNORADO", f"'{nome_upper}' já está na lista de pendentes")
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
            registrar_erro("FALHA_CRIAR_CLIENTE", f"'{nome_upper}': {exc}", exc=exc)
            return None

        if resultado and resultado.get("status") == "success":
            novo_id = resultado.get("id") or nome_upper
            CLIENTES[nome_upper] = novo_id
            CLIENTES_NORMALIZADOS[chave_norm] = (novo_id, nome_upper)
            logger.info("Cliente criado: %s (id=%s, pagamento=%s, responsavel=%s)", nome_upper, novo_id, pagamento_identificado, responsavel_final)
            return novo_id

        CLIENTES_PENDENTES.add(nome_upper)
        registrar_erro("FALHA_CADASTRO_CLIENTE", f"'{nome_upper}': resposta={resultado!r}")
        return None

    except Exception as exc:
        registrar_erro("ERRO_INESPERADO_GARANTIR_CLIENTE", f"cliente={nome_cliente!r}: {exc}", exc=exc)
        return None


def definir_prioridade(endereco, observacao):
    try:
        texto = f"{endereco or ''} {observacao or ''}".upper()
        if "URGENTE" in texto or "PRIORIDADE" in texto:
            return "Urgente"
        return "Normal"
    except Exception as exc:
        registrar_erro("ERRO_DEFINIR_PRIORIDADE", f"endereco={endereco!r} observacao={observacao!r}: {exc}", exc=exc)
        return "Normal"


def parse_valor(valor_str):
    if not valor_str:
        return 0.0
    try:
        texto = str(valor_str).replace("R$", "").replace("$", "").strip()

        tem_virgula = "," in texto
        tem_ponto = "." in texto

        if tem_virgula and tem_ponto:
            texto = texto.replace(".", "").replace(",", ".")
        elif tem_virgula and not tem_ponto:
            texto = texto.replace(",", ".")
        elif tem_ponto and not tem_virgula:
            partes = texto.split(".")
            if len(partes[-1]) != 2:
                texto = texto.replace(".", "")

        return float(texto)
    except (ValueError, TypeError) as exc:
        registrar_erro("VALOR_INVALIDO", f"'{valor_str}' não pôde ser convertido", exc=exc)
        return 0.0
    except Exception as exc:
        registrar_erro("ERRO_INESPERADO_PARSE_VALOR", f"'{valor_str}': {exc}", exc=exc)
        return 0.0


def formatar_valor(valor_str):
    valor = parse_valor(valor_str)
    return f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def formatar_valor_rs(valor_str):
    return f"R$ {formatar_valor(valor_str)}"


def extrair_telefone(observacao_bruta):
    if not observacao_bruta:
        return ""
    try:
        match = re.search(r"(\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4})", str(observacao_bruta))
        return match.group(1).strip() if match else ""
    except Exception as exc:
        registrar_erro("ERRO_EXTRAIR_TELEFONE", f"observacao={observacao_bruta!r}: {exc}", exc=exc)
        return ""


def extrair_solicitante(observacao_bruta, cliente_nome):
    try:
        if observacao_bruta:
            match = PADRAO_SOLICITANTE.search(str(observacao_bruta))
            if match:
                nome_extraido = match.group(1).strip().rstrip(".")
                nome_extraido = re.sub(r"\s{2,}", " ", nome_extraido)
                if nome_extraido:
                    return nome_extraido.upper()

        if cliente_nome and cliente_nome != "-":
            return cliente_nome.upper()

        registrar_erro("SOLICITANTE_NAO_IDENTIFICADO", f"observacao={observacao_bruta!r} cliente={cliente_nome!r}")
        return "N/A"
    except Exception as exc:
        registrar_erro("ERRO_EXTRAIR_SOLICITANTE", f"observacao={observacao_bruta!r} cliente={cliente_nome!r}: {exc}", exc=exc)
        return "N/A"


def definir_colaborador(motoboy_raw):
    try:
        nome = (motoboy_raw or "").strip().upper()
        if not nome or nome == "-":
            registrar_erro("COLABORADOR_VAZIO", "campo 'colaborador' vazio na linha bruta; registrado como 'N/A'")
            return "N/A"

        if nome not in COLABORADORES:
            COLABORADORES_PENDENTES.add(nome)
            registrar_erro("COLABORADOR_NAO_CADASTRADO", f"'{nome}' não encontrado no cadastro (getcolaboradores)")

        return nome
    except Exception as exc:
        registrar_erro("ERRO_DEFINIR_COLABORADOR", f"motoboy_raw={motoboy_raw!r}: {exc}", exc=exc)
        return "N/A"


def parse_linha(linha):
    try:
        campos = [c.strip() for c in linha.rstrip("\n").split("\t")]
        if len(campos) < CAMPOS_LINHA_TOTAL:
            registrar_erro("LINHA_CAMPOS_INSUFICIENTES", f"{len(campos)} < {CAMPOS_LINHA_TOTAL}", linha=linha)
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
    except Exception as exc:
        registrar_erro("ERRO_PARSE_LINHA", f"{exc}", linha=linha, exc=exc)
        return None


def extrair_data(campo_bruto):
    if not campo_bruto:
        return ""
    try:
        texto = str(campo_bruto).strip()

        match_br = DATA_BR_PATTERN.search(texto)
        if match_br:
            dia, mes, ano = match_br.groups()
            ano = int(ano)
            if ano < 100:
                ano += 2000
            try:
                return datetime(ano, int(mes), int(dia)).strftime("%d/%m/%Y")
            except ValueError as exc:
                registrar_erro("DATA_BR_INVALIDA", texto, exc=exc)

        match_iso = DATA_ISO_PATTERN.search(texto)
        if match_iso:
            ano, mes, dia = match_iso.groups()
            try:
                return datetime(int(ano), int(mes), int(dia)).strftime("%d/%m/%Y")
            except ValueError as exc:
                registrar_erro("DATA_ISO_INVALIDA", texto, exc=exc)

        registrar_erro("DATA_NAO_RECONHECIDA", texto)
        return ""
    except Exception as exc:
        registrar_erro("ERRO_INESPERADO_EXTRAIR_DATA", f"campo={campo_bruto!r}: {exc}", exc=exc)
        return ""


def separar_data_hora(dados):
    try:
        data_servico = extrair_data(dados["data_bruta"])
        hora_final = somente_hora(dados["hora_bruta"])

        if not data_servico:
            registrar_erro("PEDIDO_SEM_DATA", f"bruto={dados['data_bruta']!r}")
            return "", hora_final

        return data_servico, hora_final
    except Exception as exc:
        registrar_erro("ERRO_SEPARAR_DATA_HORA", f"dados={dados!r}: {exc}", exc=exc)
        return "", "00:00"


def extrair_datas_brutas(linhas):
    datas = set()
    for linha in linhas:
        try:
            dados = parse_linha(linha)
            if dados is None:
                continue
            data_str = extrair_data(dados["data_bruta"])
            data_dt = _data_para_datetime(data_str)
            if data_dt:
                datas.add(data_dt.date())
        except Exception as exc:
            registrar_erro("ERRO_EXTRAIR_DATAS_BRUTAS", f"{exc}", linha=linha, exc=exc)
    return datas


def determinar_filtro_data_automatico(todas_linhas):
    try:
        datas_existentes = carregar_datas_existentes_financeiro()
        datas_brutas = sorted(extrair_datas_brutas(todas_linhas))

        if not datas_brutas:
            registrar_erro("SEM_DATAS_VALIDAS", "Nenhuma data válida encontrada em DADOS_BRUTOS.")
            return None, None

        data_fim = datas_brutas[-1]

        data_inicio = None
        for data in datas_brutas:
            if data not in datas_existentes:
                data_inicio = data
                break

        if data_inicio is None:
            logger.info("Nenhuma data pendente de lançamento encontrada nos dados brutos.")
            return None, data_fim.strftime("%d/%m/%Y")

        logger.info("Intervalo de lançamento definido: INICIO=%s FIM=%s", data_inicio.strftime("%d/%m/%Y"), data_fim.strftime("%d/%m/%Y"))
        return data_inicio.strftime("%d/%m/%Y"), data_fim.strftime("%d/%m/%Y")
    except Exception as exc:
        registrar_erro("ERRO_DETERMINAR_FILTRO_DATA", f"{exc}", exc=exc)
        return None, None


def linha_dentro_do_filtro(dados, filtro_inicio, filtro_fim):
    try:
        if not filtro_inicio and not filtro_fim:
            return True

        data_str, _ = separar_data_hora(dados)
        data_dt = _data_para_datetime(data_str)
        if not data_dt:
            return False

        inicio_dt = _data_para_datetime(filtro_inicio) if filtro_inicio else None
        fim_dt = _data_para_datetime(filtro_fim) if filtro_fim else None

        if inicio_dt and data_dt < inicio_dt:
            return False
        if fim_dt and data_dt > fim_dt:
            return False
        return True
    except Exception as exc:
        registrar_erro("ERRO_FILTRO_LINHA", f"dados={dados!r}: {exc}", exc=exc)
        return False


def montar_descricao_financeiro(dados, hora_str, valor_rs):
    try:
        tipo_servico = dados["tipo_servico"] or "ENTREGA"
        cliente_nome = dados["cliente_nome"] or ""
        endereco_para = dados["endereco_para"] or ""

        partes = [tipo_servico]
        if cliente_nome and cliente_nome != "-":
            partes.append(f"de {cliente_nome}")
        if endereco_para:
            partes.append(f"para {endereco_para}")
        partes.append(f"[{hora_str} | {valor_rs}]")

        return " ".join(partes).strip()
    except Exception as exc:
        registrar_erro("ERRO_MONTAR_DESCRICAO", f"dados={dados!r}: {exc}", exc=exc)
        return ""


def montar_dados_consolidados(rdo_id, dados, id_cliente, motoboy_final):
    try:
        data_str, hora_str = separar_data_hora(dados)

        if not data_str:
            registrar_erro("RDO_SEM_DATA", f"RDO {rdo_id}: data bruta {dados['data_bruta']!r} não extraída; pedido será lançado SEM DATA.")

        tipo_servico = dados["tipo_servico"] or "ENTREGA"
        cliente_nome = dados["cliente_nome"] or ""
        endereco_para = dados["endereco_para"] or ""
        observacao = dados["observacao_bruta"] or ""
        solicitante = dados["solicitante"] or "N/A"
        valor_rs = formatar_valor_rs(dados["valor_corrida"])

        if id_cliente is None and cliente_nome and cliente_nome != "-":
            registrar_erro("RDO_SEM_ID_CLIENTE", f"RDO {rdo_id}: cliente '{cliente_nome}' sem id_cliente resolvido!")

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
            "descricao_final": montar_descricao_financeiro(dados, hora_str, valor_rs),
            "tipo_servico": tipo_servico,
            "endereco_para": endereco_para,
            "valor_rs": valor_rs,
            "telefone": dados.get("telefone") or "",
        }
    except Exception as exc:
        registrar_erro("ERRO_MONTAR_CONSOLIDADO", f"RDO {rdo_id}: {exc}", exc=exc)
        raise


def criar_pedido(consolidado):
    rdo_id = consolidado["rdo_id"]
    try:
        payload = {
            "action": "criarpedido",
            "apiKey": API_KEY,
            "id": rdo_id,
            "id_cliente": consolidado["id_cliente"],
            "solicitante": consolidado["solicitante"],
            "contato": consolidado["telefone"],
            "data": consolidado["data_str"],
            "horario": consolidado["hora_str"],
            "hora": consolidado["hora_str"],
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
            registrar_erro("FALHA_CRIAR_PEDIDO", f"RDO {rdo_id}: {exc}", exc=exc)
            return False, str(exc)

        if not resultado or resultado.get("status") != "success":
            detalhe = f"resposta={resultado!r}"
            registrar_erro("FALHA_CRIAR_PEDIDO", f"RDO {rdo_id}: {detalhe}")
            return False, detalhe

        logger.info("Pedido criado: %s | data=%s | cliente=%s | id_cliente=%s", rdo_id, consolidado["data_str"], consolidado["cliente_nome"], consolidado["id_cliente"])
        return True, None
    except Exception as exc:
        registrar_erro("ERRO_INESPERADO_CRIAR_PEDIDO", f"RDO {rdo_id}: {exc}", exc=exc)
        return False, str(exc)


def criar_financeiro(consolidado):
    rdo_id = consolidado["rdo_id"]
    motoboy_final = consolidado["motoboy_final"]
    try:
        colaborador_id = COLABORADORES.get(motoboy_final)
        if not colaborador_id:
            registrar_erro("FINANCEIRO_SEM_COLABORADOR_ID", f"RDO {rdo_id}: colaborador '{motoboy_final}' não encontrado no mapa")

        payload = {
            "action": "criarfinanceiro",
            "apiKey": API_KEY,
            "id": rdo_id + "-FIN",
            "colaborador_id": colaborador_id or "",
            "id_pedido": rdo_id,
            "data": consolidado["data_str"],
            "horario": consolidado["hora_str"],
            "hora": consolidado["hora_str"],
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
            registrar_erro("FALHA_CRIAR_FINANCEIRO", f"RDO {rdo_id}: {exc}", exc=exc)
            return False, str(exc)

        if not resultado or resultado.get("status") != "success":
            detalhe = f"resposta={resultado!r}"
            registrar_erro("FALHA_CRIAR_FINANCEIRO", f"RDO {rdo_id}: {detalhe}")
            return False, detalhe

        logger.info("Financeiro lançado: %s | data=%s | colaborador=%s | tipo=%s | valor=%s", rdo_id, consolidado["data_str"], motoboy_final, TIPO_FINANCEIRO_PADRAO, consolidado["valor_rs"])
        return True, None
    except Exception as exc:
        registrar_erro("ERRO_INESPERADO_CRIAR_FINANCEIRO", f"RDO {rdo_id}: {exc}", exc=exc)
        return False, str(exc)


def _tratar_interrupcao(signum, frame):
    logger.critical("Execução interrompida pelo usuário (SIGINT).")
    raise SystemExit(1)


signal.signal(signal.SIGINT, _tratar_interrupcao)


def exibir_resumo_erros():
    if not REGISTRO_ERROS:
        logger.info("Nenhum erro ou aviso registrado durante a execução.")
        return

    agrupado = defaultdict(list)
    for erro in REGISTRO_ERROS:
        agrupado[erro["tipo"]].append(erro)

    logger.critical("=" * 90)
    logger.critical("RESUMO COMPLETO DE ERROS/AVISOS DA EXECUÇÃO (total: %d)", len(REGISTRO_ERROS))
    logger.critical("=" * 90)
    for tipo, itens in sorted(agrupado.items(), key=lambda x: -len(x[1])):
        logger.critical("-> [%s] (%d ocorrências)", tipo, len(itens))
        for item in itens:
            linha_info = f" | linha={item['linha']!r}" if item["linha"] else ""
            logger.critical("     - %s%s", item["detalhe"], linha_info)
            if item["traceback"]:
                logger.critical("       TRACEBACK:\n%s", item["traceback"])
    logger.critical("=" * 90)


def main():
    global CLIENTES, COLABORADORES, RDOS_EXISTENTES, RDO_SEQ
    global FILTRO_DATA_INICIO, FILTRO_DATA_FIM

    try:
        verificar_ids_duplicados()

        COLABORADORES = carregar_colaboradores()
        CLIENTES = carregar_clientes()
        RDOS_EXISTENTES = carregar_rdos_existentes()
        RDO_SEQ = determinar_rdo_seq_inicial(RDOS_EXISTENTES)

        maior_rdo_financeiro = carregar_maior_rdo_financeiro()
        conferir_ultimo_rdo_com_financeiro(RDO_SEQ, maior_rdo_financeiro)

        todas_linhas = [l for l in DADOS_BRUTOS.split("\n") if l.strip()]
        logger.info("Total de linhas brutas a processar: %d.", len(todas_linhas))

        filtro_inicio, filtro_fim = determinar_filtro_data_automatico(todas_linhas)
        FILTRO_DATA_INICIO, FILTRO_DATA_FIM = filtro_inicio, filtro_fim

        logger.info("Filtro de data definido automaticamente: INICIO=%s FIM=%s", filtro_inicio, filtro_fim)

        total_processadas = 0
        total_ignoradas_filtro = 0
        total_erros_parse = 0
        total_sucesso = 0
        total_falha = 0

        for linha in todas_linhas:
            try:
                dados = parse_linha(linha)
                if dados is None:
                    total_erros_parse += 1
                    continue

                if not linha_dentro_do_filtro(dados, filtro_inicio, filtro_fim):
                    total_ignoradas_filtro += 1
                    continue

                total_processadas += 1

                if dados["cliente_nome"] and dados["cliente_nome"] != "-":
                    id_cliente = garantir_cliente(dados["cliente_nome"], responsavel=dados.get("solicitante", ""))
                else:
                    id_cliente = None

                motoboy_final = definir_colaborador(dados["motoboy_raw"])
                rdo_id = proximo_rdo_id()
                consolidado = montar_dados_consolidados(rdo_id, dados, id_cliente, motoboy_final)

                ok_pedido, erro_pedido = criar_pedido(consolidado)
                time.sleep(INTERVALO_ENTRE_REQUISICOES)

                if not ok_pedido:
                    total_falha += 1
                    logger.error("RDO %s: pedido não criado, financeiro será ignorado. Motivo: %s", rdo_id, erro_pedido)
                    continue

                ok_financeiro, erro_financeiro = criar_financeiro(consolidado)
                time.sleep(INTERVALO_ENTRE_REQUISICOES)

                if ok_pedido and ok_financeiro:
                    total_sucesso += 1
                else:
                    total_falha += 1
                    registrar_erro("RDO_FALHA_PARCIAL", f"RDO {rdo_id}: pedido={ok_pedido} financeiro={ok_financeiro}")

            except Exception as exc:
                total_falha += 1
                registrar_erro("EXCECAO_INESPERADA_LINHA", str(exc), linha=linha, exc=exc)
                continue

        logger.info(
            "Resumo da execução: linhas_totais=%d processadas=%d ignoradas_filtro=%d erros_parse=%d sucesso=%d falha=%d",
            len(todas_linhas), total_processadas, total_ignoradas_filtro, total_erros_parse, total_sucesso, total_falha
        )

        if COLABORADORES_PENDENTES:
            logger.warning("Colaboradores não cadastrados encontrados: %s", sorted(COLABORADORES_PENDENTES))
        if CLIENTES_PENDENTES:
            logger.warning("Clientes com falha de cadastro: %s", sorted(CLIENTES_PENDENTES))

    finally:
        exibir_resumo_erros()


if __name__ == "__main__":
    try:
        main()
    except ErroFatalGeracao as exc:
        logger.critical("Erro fatal na geração de dados: %s", exc)
        registrar_erro("ERRO_FATAL_GERACAO", str(exc), exc=exc)
        exibir_resumo_erros()
        sys.exit(1)
    except Exception as exc:
        logger.critical("Erro fatal não tratado: %s\n%s", exc, traceback.format_exc())
        registrar_erro("ERRO_FATAL_NAO_TRATADO", str(exc), exc=exc)
        exibir_resumo_erros()
        sys.exit(1)
