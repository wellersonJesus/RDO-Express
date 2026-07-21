import os
import time
import re
import logging
import signal
import sys
import traceback
from datetime import datetime
from pathlib import Path
from collections import Counter

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

ULTIMO_RDO_LANCADO = "RDO2884"
FILTRO_DATA_INICIO = "16/07/2026"
FILTRO_DATA_FIM = "20/07/2026"

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


def _buscar_lista(action):
    resultado = post({"action": action, "apiKey": API_KEY})
    return _extrair_lista_dados(resultado, action)


def verificar_ids_duplicados():
    logger.info("Verificando duplicidade de IDs no banco (pedidos e financeiro)...")

    problemas_encontrados = False

    try:
        pedidos = _buscar_lista("getpedidos")
    except (ErroApi, ErroFatalGeracao) as exc:
        logger.error("Não foi possível verificar duplicidade em 'pedidos': %s", exc)
        pedidos = []

    ids_pedidos = [str(item.get("id", "")).strip().upper() for item in pedidos if item.get("id")]
    contagem_pedidos = Counter(ids_pedidos)
    duplicados_pedidos = {rdo: qtd for rdo, qtd in contagem_pedidos.items() if qtd > 1}

    if duplicados_pedidos:
        problemas_encontrados = True
        logger.critical("=" * 70)
        logger.critical("DUPLICIDADE DETECTADA NA TABELA 'PEDIDOS':")
        for rdo_id, qtd in sorted(duplicados_pedidos.items()):
            logger.critical("  -> ID '%s' aparece %d vezes.", rdo_id, qtd)
        logger.critical("=" * 70)

    try:
        financeiros = _buscar_lista("getfinanceiro")
    except (ErroApi, ErroFatalGeracao) as exc:
        logger.error("Não foi possível verificar duplicidade em 'financeiro': %s", exc)
        financeiros = []

    ids_financeiro = [str(item.get("id", "")).strip().upper() for item in financeiros if item.get("id")]
    contagem_financeiro = Counter(ids_financeiro)
    duplicados_financeiro = {fin: qtd for fin, qtd in contagem_financeiro.items() if qtd > 1}

    if duplicados_financeiro:
        problemas_encontrados = True
        logger.critical("=" * 70)
        logger.critical("DUPLICIDADE DETECTADA NA TABELA 'FINANCEIRO':")
        for fin_id, qtd in sorted(duplicados_financeiro.items()):
            logger.critical("  -> ID '%s' aparece %d vezes.", fin_id, qtd)
        logger.critical("=" * 70)

    ids_pedidos_sem_sufixo = set(ids_pedidos)
    ids_fin_sem_sufixo = set()
    for fin_id in ids_financeiro:
        match = RDO_FIN_PATTERN.match(fin_id)
        if match:
            ids_fin_sem_sufixo.add(f"RDO{int(match.group(1)):03d}")

    faltando_financeiro = sorted(ids_pedidos_sem_sufixo - ids_fin_sem_sufixo)
    if faltando_financeiro:
        logger.warning(
            "ATENCAO: os pedidos abaixo existem em 'pedidos' mas NAO possuem financeiro correspondente: %s",
            faltando_financeiro
        )

    if problemas_encontrados:
        raise ErroFatalGeracao(
            "Foram encontrados IDs duplicados no banco. Corrija/apague os registros duplicados "
            "listados acima antes de rodar o geraDados novamente."
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
        dados = _buscar_lista("getfinanceiro")
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
        logger.error("Falha ao buscar datas existentes no financeiro: %s.", exc)
    logger.info("Datas distintas já lançadas no financeiro: %d.", len(datas))
    return datas


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
        dados = _buscar_lista("getcolaboradores")
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
        dados = _buscar_lista("getclientes")
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
    if not nome_upper or nome_upper == "-":
        logger.error("Nome de cliente vazio/inválido recebido em garantir_cliente().")
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

    try:
        return float(texto)
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
            "Colaborador '%s' não encontrado no cadastro (getcolaboradores).",
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


def extrair_datas_brutas(linhas):
    datas = set()
    for linha in linhas:
        dados = parse_linha(linha)
        if dados is None:
            continue
        data_str = extrair_data(dados["data_bruta"])
        data_dt = _data_para_datetime(data_str)
        if data_dt:
            datas.add(data_dt.date())
    return datas


def determinar_filtro_data_automatico(todas_linhas):
    datas_existentes = carregar_datas_existentes_financeiro()
    datas_brutas = sorted(extrair_datas_brutas(todas_linhas))
    hoje = datetime.now().date()

    data_inicio = None
    for data in datas_brutas:
        if data > hoje:
            continue
        if data not in datas_existentes:
            data_inicio = data
            break

    if data_inicio is None:
        logger.info("Nenhuma data pendente de lançamento encontrada nos dados brutos.")
        return None, hoje.strftime("%d/%m/%Y")

    logger.info(
        "Primeira data pendente de lançamento detectada (gap): %s.",
        data_inicio.strftime("%d/%m/%Y")
    )
    return data_inicio.strftime("%d/%m/%Y"), hoje.strftime("%d/%m/%Y")


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


def montar_descricao_financeiro(dados, hora_str, valor_rs):
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
    valor_rs = formatar_valor_rs(dados["valor_corrida"])

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
        logger.error("Exceção ao criar pedido %s: %s", rdo_id, exc)
        return False, str(exc)

    if not resultado or resultado.get("status") != "success":
        detalhe = f"resposta={resultado!r}"
        logger.error("Falha ao criar pedido %s: %s", rdo_id, detalhe)
        return False, detalhe

    logger.info("Pedido criado: %s | data=%s | cliente=%s", rdo_id, consolidado["data_str"], consolidado["cliente_nome"])
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
    global FILTRO_DATA_INICIO, FILTRO_DATA_FIM

    verificar_ids_duplicados()

    COLABORADORES = carregar_colaboradores()
    CLIENTES = carregar_clientes()
    RDOS_EXISTENTES = carregar_rdos_existentes()
    RDO_SEQ = determinar_rdo_seq_inicial(RDOS_EXISTENTES)

    maior_rdo_financeiro = carregar_maior_rdo_financeiro()
    conferir_ultimo_rdo_com_financeiro(RDO_SEQ, maior_rdo_financeiro)

    todas_linhas = [l for l in DADOS_BRUTOS.split("\n") if l.strip()]
    logger.info("Total de linhas brutas a processar: %d.", len(todas_linhas))

    FILTRO_DATA_INICIO, FILTRO_DATA_FIM = determinar_filtro_data_automatico(todas_linhas)

    logger.info(
        "Filtro de data definido automaticamente (com detecção de gaps): INICIO=%s FIM=%s",
        FILTRO_DATA_INICIO, FILTRO_DATA_FIM
    )

    total_processadas = 0
    total_ignoradas_filtro = 0
    total_erros_parse = 0
    total_sucesso = 0
    total_falha = 0

    for linha in todas_linhas:
        dados = parse_linha(linha)
        if dados is None:
            total_erros_parse += 1
            continue

        if not linha_dentro_do_filtro(dados):
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
            logger.error(
                "RDO %s: concluído com falhas parciais. pedido=%s financeiro=%s",
                rdo_id, ok_pedido, ok_financeiro
            )

    logger.info(
        "Resumo da execução: linhas_totais=%d processadas=%d ignoradas_filtro=%d erros_parse=%d sucesso=%d falha=%d",
        len(todas_linhas), total_processadas, total_ignoradas_filtro, total_erros_parse, total_sucesso, total_falha
    )

    if COLABORADORES_PENDENTES:
        logger.warning("Colaboradores não cadastrados encontrados: %s", sorted(COLABORADORES_PENDENTES))
    if CLIENTES_PENDENTES:
        logger.warning("Clientes com falha de cadastro: %s", sorted(CLIENTES_PENDENTES))


if __name__ == "__main__":
    try:
        main()
    except ErroFatalGeracao as exc:
        logger.critical("Erro fatal na geração de dados: %s", exc)
        sys.exit(1)
    except Exception as exc:
        logger.critical("Erro fatal não tratado: %s\n%s", exc, traceback.format_exc())
        sys.exit(1)
