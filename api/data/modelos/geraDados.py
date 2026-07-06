import os
import time
import uuid
import logging
import signal
import sys
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("geraDados")

URL = os.getenv("API_URL")
API_KEY = os.getenv("SECRET_KEY")

if not URL or not API_KEY:
    logger.error("API_URL ou SECRET_KEY ausentes no .env (%s).", ENV_PATH)
else:
    logger.info("Configuração carregada de: %s", ENV_PATH)

SESSAO = requests.Session()
_retry = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504], allowed_methods=["POST"])
SESSAO.mount("https://", HTTPAdapter(max_retries=_retry))
SESSAO.mount("http://", HTTPAdapter(max_retries=_retry))

TIMEOUT_CONEXAO = (5, 15)

MOTOBOYS_FIXOS = {"AUANDER", "IGOR", "EMERSON"}

CLIENTES = {}
COLABORADORES = {}
CLIENTES_PENDENTES = set()

RDO_SEQ = 0


def post(payload, tentativas=2):
    for tentativa in range(tentativas):
        try:
            resp = SESSAO.post(URL, json=payload, timeout=TIMEOUT_CONEXAO)
            if resp.status_code == 200:
                try:
                    return resp.json()
                except ValueError:
                    logger.error("Resposta não é JSON válido: %s", resp.text[:300])
                    return {"status": "error", "message": "Resposta inválida (não-JSON)"}
            logger.warning("Tentativa %d: HTTP %d na ação '%s'", tentativa + 1, resp.status_code, payload.get("action"))
        except requests.exceptions.Timeout:
            logger.warning("Tentativa %d: timeout na ação '%s'", tentativa + 1, payload.get("action"))
        except requests.RequestException as exc:
            logger.warning("Tentativa %d: erro de conexão -> %s", tentativa + 1, exc)
        time.sleep(1 * (tentativa + 1))
    return {"status": "error", "message": "Falha de conexão após tentativas"}


def gerar_id_curto(tamanho=11):
    return uuid.uuid4().hex[:tamanho]


def proximo_rdo_id():
    global RDO_SEQ
    RDO_SEQ += 1
    return f"RDO{RDO_SEQ:03d}"


def carregar_colaboradores():
    resultado = post({"action": "getcolaboradores", "apiKey": API_KEY})
    mapa = {}
    dados = resultado.get("data") if isinstance(resultado, dict) else resultado
    if isinstance(dados, list):
        for item in dados:
            nome = str(item.get("username", "")).strip().upper()
            if nome:
                mapa[nome] = item.get("id")
    else:
        logger.error("Resposta inesperada de getcolaboradores: %s", resultado)
    logger.info("Colaboradores carregados: %d", len(mapa))
    return mapa


def carregar_clientes():
    resultado = post({"action": "getclientes", "apiKey": API_KEY})
    mapa = {}
    dados = resultado.get("data") if isinstance(resultado, dict) else resultado
    if isinstance(dados, list):
        for item in dados:
            nome = str(item.get("username", "")).strip().upper()
            if nome:
                mapa[nome] = item.get("id")
    else:
        logger.error("Resposta inesperada de getclientes: %s", resultado)
    logger.info("Clientes carregados: %d", len(mapa))
    return mapa


def garantir_cliente(nome_cliente, responsavel=""):
    nome_upper = nome_cliente.strip().upper()
    if not nome_upper:
        return None

    if nome_upper in CLIENTES:
        return CLIENTES[nome_upper]

    if nome_upper in CLIENTES_PENDENTES:
        return None

    payload = {
        "action": "criarcliente",
        "apiKey": API_KEY,
        "username": nome_upper,
        "responsavel": responsavel or "",
        "contato": "",
        "imagem": "",
        "pagamento": "",
        "status": "Ativo",
    }
    resultado = post(payload)

    if resultado and resultado.get("status") == "success":
        novo_id = resultado.get("id") or nome_upper
        CLIENTES[nome_upper] = novo_id
        logger.info("Novo cliente cadastrado: %s (id=%s)", nome_upper, novo_id)
        return novo_id

    CLIENTES_PENDENTES.add(nome_upper)
    logger.error("Falha ao cadastrar cliente '%s'. Marcado para CADASTRO MANUAL: %s", nome_upper, resultado)
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
    except ValueError:
        return 0.0


def definir_colaborador(motoboy_raw):
    nome = motoboy_raw.strip().upper()
    if nome in MOTOBOYS_FIXOS:
        return nome, ""
    if nome:
        return "GRUPO", f"Grupo - {nome}"
    return "GRUPO", ""


def parse_linha(linha):
    campos = [c.strip() for c in linha.rstrip("\n").split("\t")]
    if not campos:
        return None
    if campos[0].isdigit():
        campos = campos[1:]
    if len(campos) < 9:
        return None
    while len(campos) < 10:
        campos.insert(2, "")
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
        "observacao_bruta": campos[9] if len(campos) > 9 else "",
    }


def criar_pedido(rdo_id, dados, id_cliente, motoboy_final, observacao):
    payload = {
        "action": "criarpedido",
        "apiKey": API_KEY,
        "id": rdo_id,
        "id_cliente": id_cliente,
        "solicitante": dados["solicitante"],
        "contato": dados["solicitante"],
        "horario": dados["data_pedido"] or dados["data_lancamento"],
        "mercadoria": dados["tipo_servico"] or "ENTREGA",
        "de": dados["cliente_nome"],
        "para": dados["endereco"],
        "retorno": "NÃO",
        "prioridade": definir_prioridade(dados["endereco"]),
        "valor_corrida": dados["valor_corrida"],
        "motoboy": motoboy_final,
        "status": "NÃO",
        "observacao": observacao or dados["observacao_bruta"],
    }
    resultado = post(payload)
    if not resultado or resultado.get("status") != "success":
        logger.error("Falha ao criar pedido %s: %s", rdo_id, resultado)
        return False
    return True


def criar_chat(rdo_id, id_cliente, dados):
    data_ref = dados["data_pedido"] or dados["data_lancamento"]
    partes = data_ref.split(" ") if data_ref else ["", ""]
    data_str = partes[0] if partes[0] else ""
    hora_str = partes[1] if len(partes) > 1 and partes[1] else "00:00"

    texto = (
        f"📦 N.SERVIÇO: {rdo_id}\n"
        f"👤 : {dados['solicitante'] or 'Não informado'} 📞 : {dados['solicitante'] or ''}\n"
        f"📦 : {dados['tipo_servico'] or 'ENTREGA'}"
    )

    payload = {
        "action": "criarchat",
        "apiKey": API_KEY,
        "id": gerar_id_curto(),
        "id_cliente": id_cliente,
        "pedido_id": rdo_id,
        "texto": texto,
        "hora": hora_str,
        "data": data_str,
        "finalizado": "TRUE",
    }
    resultado = post(payload)
    if not resultado or resultado.get("status") != "success":
        logger.warning("Falha ao criar chat para %s: %s", rdo_id, resultado)

def criar_financeiro(rdo_id, dados, motoboy_final, observacao):
    colaborador_id = COLABORADORES.get(motoboy_final)
    if not colaborador_id:
        logger.warning("Colaborador '%s' não encontrado na base. Financeiro será lançado sem colaborador_id.", motoboy_final)

    payload = {
        "action": "addfinanceiro",
        "apiKey": API_KEY,
        "id": gerar_id_curto(),
        "colaborador_id": colaborador_id,
        "id_pedido": rdo_id,
        "data": dados["data_pedido"] or dados["data_lancamento"].split(" ")[0],
        "tipo": dados["tipo_servico"] or "ENTREGA",
        "descricao": f"Corrida {rdo_id}",
        "motoboy": motoboy_final,
        "vlr_servico": parse_valor(dados["valor_corrida"]),
        "colaborador": motoboy_final,
        "rdo": rdo_id,
        "observacao": observacao or dados["observacao_bruta"],
        "situacao": "NÃO",
    }
    post(payload)


def _tratar_interrupcao(signum, frame):
    logger.warning("Execução interrompida pelo usuário (Ctrl+C). Encerrando...")
    sys.exit(1)


signal.signal(signal.SIGINT, _tratar_interrupcao)


def main():
    global CLIENTES, COLABORADORES

    if not URL or not API_KEY:
        logger.error("URL ou SECRET_KEY não configurados. Abortando.")
        return

    COLABORADORES = carregar_colaboradores()
    if not COLABORADORES:
        logger.warning("Nenhum colaborador encontrado. Verifique se a base de colaboradores já foi populada.")

    CLIENTES = carregar_clientes()

    linhas = [l for l in DADOS_BRUTOS.split("\n") if l.strip()]

    inseridos = 0
    ignorados = 0
    clientes_criados = 0

    for linha in linhas:
        dados = parse_linha(linha)
        if not dados:
            ignorados += 1
            continue

        nome_cliente = dados["cliente_nome"]
        existia = nome_cliente in CLIENTES
        id_cliente = garantir_cliente(nome_cliente, responsavel=dados["solicitante"])

        if not id_cliente:
            ignorados += 1
            continue

        if not existia:
            clientes_criados += 1

        motoboy_final, observacao = definir_colaborador(dados["motoboy"])
        rdo_id = proximo_rdo_id()

        if not criar_pedido(rdo_id, dados, id_cliente, motoboy_final, observacao):
            ignorados += 1
            continue

        criar_chat(rdo_id, id_cliente, dados)
        criar_financeiro(rdo_id, dados, motoboy_final, observacao)

        inseridos += 1
        time.sleep(0.2)

    logger.info("Concluído. Pedidos inseridos: %d | Clientes novos: %d | Ignorados: %d", inseridos, clientes_criados, ignorados)

    if CLIENTES_PENDENTES:
        logger.warning("Clientes pendentes de CADASTRO MANUAL (%d): %s", len(CLIENTES_PENDENTES), sorted(CLIENTES_PENDENTES))


if __name__ == "__main__":
    main()
