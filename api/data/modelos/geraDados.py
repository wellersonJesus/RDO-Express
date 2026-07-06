import os
import time
import uuid
import re
import logging
import signal
import sys
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("geraDados")

URL = os.getenv("API_URL")
API_KEY = os.getenv("SECRET_KEY")

if not URL or not API_KEY:
    logger.error("API_URL ou SECRET_KEY ausentes no .env (%s).", ENV_PATH)
    sys.exit(1)

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
CHATS_EXISTENTES = set()
RDO_SEQ = 0

STATUS_CLIENTE_PADRAO = "TRUE"
PAGAMENTO_CLIENTE_PADRAO = ""

RDO_PATTERN = re.compile(r"^RDO0*(\d+)$", re.IGNORECASE)
HORA_STRICT_PATTERN = re.compile(r"(\d{1,2}):(\d{2})")

def post(payload, tentativas=MAX_TENTATIVAS_POST):
    for tentativa in range(tentativas):
        try:
            resp = SESSAO.post(URL, json=payload, timeout=TIMEOUT_CONEXAO)
            if resp.status_code == 200:
                try:
                    return resp.json()
                except ValueError:
                    return {"status": "error", "message": "Resposta inválida (não-JSON)"}
            logger.warning("Tentativa %d/%d: HTTP %d na ação '%s'", tentativa + 1, tentativas, resp.status_code, payload.get("action"))
        except requests.exceptions.Timeout:
            logger.warning("Tentativa %d/%d: timeout na ação '%s'", tentativa + 1, tentativas, payload.get("action"))
        except requests.RequestException as exc:
            logger.warning("Tentativa %d/%d: erro na ação '%s' -> %s", tentativa + 1, tentativas, payload.get("action"), exc)
        if tentativa < tentativas - 1:
            time.sleep(3 * (tentativa + 1))
    return {"status": "error", "message": "Falha após tentativas"}

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

def carregar_rdos_existentes():
    resultado = post({"action": "getpedidos", "apiKey": API_KEY})
    dados = resultado.get("data") if isinstance(resultado, dict) else resultado
    ids = set()
    maior = 0
    if not isinstance(dados, list):
        logger.error("Não foi possível carregar pedidos existentes. Abortando para evitar duplicidade.")
        sys.exit(1)
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
    dados = resultado.get("data") if isinstance(resultado, dict) else resultado
    pedidos_com_chat = set()
    if isinstance(dados, list):
        for item in dados:
            pedido_id = str(item.get("pedido_id", "")).strip().upper()
            if pedido_id:
                pedidos_com_chat.add(pedido_id)
    logger.info("Pedidos com chat já existente: %d", len(pedidos_com_chat))
    return pedidos_com_chat

def corrigir_horarios_antigos():
    resultado = post({"action": "getpedidos", "apiKey": API_KEY})
    dados = resultado.get("data") if isinstance(resultado, dict) else resultado
    if not isinstance(dados, list):
        return
    corrigidos = 0
    for item in dados:
        rdo_id = str(item.get("id", "")).strip().upper()
        horario_atual = str(item.get("horario", "")).strip()
        if not rdo_id or not horario_atual:
            continue
        if "/" in horario_atual or "-" in horario_atual:
            hora_corrigida = somente_hora(horario_atual)
            payload = {
                "action": "atualizarpedido",
                "apiKey": API_KEY,
                "id": rdo_id,
                "horario": hora_corrigida,
            }
            resp = post(payload)
            if resp and resp.get("status") == "success":
                corrigidos += 1
                logger.info("Corrigido horario de %s: '%s' -> '%s'", rdo_id, horario_atual, hora_corrigida)
            else:
                logger.warning("Falha ao corrigir horario de %s: %s", rdo_id, resp)
            time.sleep(INTERVALO_ENTRE_REQUISICOES)
    if corrigidos:
        logger.info("Total de pedidos corrigidos: %d", corrigidos)

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
    mapa = {}
    dados = resultado.get("data") if isinstance(resultado, dict) else resultado
    if isinstance(dados, list):
        for item in dados:
            nome = str(item.get("username", "")).strip().upper()
            if nome:
                mapa[nome] = item.get("id")
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
        "pagamento": PAGAMENTO_CLIENTE_PADRAO,
        "status": STATUS_CLIENTE_PADRAO,
    }
    resultado = post(payload)
    if resultado and resultado.get("status") == "success":
        novo_id = resultado.get("id") or nome_upper
        CLIENTES[nome_upper] = novo_id
        logger.info("Cliente criado: %s (id=%s)", nome_upper, novo_id)
        return novo_id
    CLIENTES_PENDENTES.add(nome_upper)
    logger.error("Falha ao cadastrar cliente '%s': %s", nome_upper, resultado)
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

def formatar_valor(valor_str):
    valor = parse_valor(valor_str)
    return f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

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

def normalizar_data(parte_data):
    if not parte_data:
        return ""
    for formato in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(parte_data, formato).strftime("%d/%m/%Y")
        except ValueError:
            continue
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
    return "", "00:00"

def criar_pedido(rdo_id, dados, id_cliente, motoboy_final, observacao):
    _, hora_str = separar_data_hora(dados)
    hora_str = somente_hora(hora_str)
    data_str, _ = separar_data_hora(dados)

    texto_chat = montar_texto_chat(rdo_id, dados)  # modelo 2 (com rotas)

    # Status final: pedido já concluído, com o motoboy embutido no formato
    # "MOTOBOY/CONCLUIDO" (mesmo padrão usado pelo StatusModal do chat.js),
    # garantindo que a tabela de pedidos exiba corretamente o motoboy responsável.
    status_final = f"{motoboy_final}/CONCLUIDO" if motoboy_final else "CONCLUIDO"

    payload = {
        "action": "criarpedido",
        "apiKey": API_KEY,
        "id": rdo_id,
        "id_cliente": id_cliente,
        "solicitante": dados["solicitante"],
        "contato": dados["solicitante"],
        "horario": hora_str,
        "mercadoria": dados["tipo_servico"] or "ENTREGA",
        "de": dados["cliente_nome"],
        "para": dados["endereco"],
        "retorno": "NÃO",
        "prioridade": definir_prioridade(dados["endereco"]),
        "valor_corrida": dados["valor_corrida"],
        "motoboy": motoboy_final,
        "status": status_final,
        "observacao": observacao or dados["observacao_bruta"],
        # Enviado junto para o WebScript usar na criação automática do chat:
        "texto": texto_chat,
        "hora": hora_str,
        "data_chat": data_str,
    }
    resultado = post(payload)
    if not resultado or resultado.get("status") != "success":
        logger.error("Falha ao criar pedido %s: %s", rdo_id, resultado)
        return False
    return True

def montar_texto_chat(rdo_id, dados):
    solicitante = dados["solicitante"] or "Não informado"
    contato = dados["solicitante"] or ""
    tipo_servico = dados["tipo_servico"] or "ENTREGA"
    origem = dados["cliente_nome"] or ""
    destino = dados["endereco"] or ""
    valor = formatar_valor(dados["valor_corrida"])
    linhas = [
        f"📦 N.SERVIÇO: {rdo_id}",
        f"👤 : {solicitante} 📞 : {contato}",
        f"📦 : {tipo_servico}",
        "📍 ROTAS:",
        f"1. De: {origem} | Para: {destino}.",
        f"🛣️ 0.00 km ⏱️ 0min 💰 R$ {valor}",
    ]
    return "\n".join(linhas)

def criar_chat(rdo_id, id_cliente, dados):
    if rdo_id in CHATS_EXISTENTES:
        logger.warning("Chat já existe para %s. Ignorando criação duplicada.", rdo_id)
        return
    data_str, hora_str = separar_data_hora(dados)
    hora_str = somente_hora(hora_str)
    texto = montar_texto_chat(rdo_id, dados)
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
    if resultado and resultado.get("status") == "success":
        CHATS_EXISTENTES.add(rdo_id)
    else:
        logger.warning("Falha ao criar chat para %s: %s", rdo_id, resultado)

def criar_financeiro(rdo_id, dados, motoboy_final, observacao):
    colaborador_id = COLABORADORES.get(motoboy_final)
    if not colaborador_id:
        logger.warning("Colaborador '%s' não encontrado. Financeiro sem colaborador_id.", motoboy_final)

    data_str, _ = separar_data_hora(dados)
    payload = {
        "action": "addfinanceiro",
        "apiKey": API_KEY,
        "id": gerar_id_curto(),
        "colaborador_id": colaborador_id,
        "id_pedido": rdo_id,
        "data": data_str,
        "tipo": dados["tipo_servico"] or "ENTREGA",
        "descricao": f"Corrida {rdo_id}",
        "motoboy": motoboy_final,
        "vlr_servico": parse_valor(dados["valor_corrida"]),
        "colaborador": motoboy_final,
        "observacao": observacao or dados["observacao_bruta"],
        "situacao": "PAGO",
    }
    resultado = post(payload)
    if not resultado or resultado.get("status") != "success":
        logger.error("Falha ao lançar financeiro %s: %s", rdo_id, resultado)

def _tratar_interrupcao(signum, frame):
    logger.warning("Execução interrompida pelo usuário. Encerrando...")
    sys.exit(1)

signal.signal(signal.SIGINT, _tratar_interrupcao)

def main():
    global CLIENTES, COLABORADORES, RDOS_EXISTENTES, RDO_SEQ, CHATS_EXISTENTES

    COLABORADORES = carregar_colaboradores()
    CLIENTES = carregar_clientes()
    RDOS_EXISTENTES, RDO_SEQ = carregar_rdos_existentes()
    CHATS_EXISTENTES = carregar_chats_existentes()

    corrigir_horarios_antigos()

    linhas = [l for l in DADOS_BRUTOS.split("\n") if l.strip()]

    inseridos = 0
    ignorados = 0
    clientes_criados = 0

    for indice, linha in enumerate(linhas, start=1):
        dados = parse_linha(linha)
        if not dados:
            ignorados += 1
            continue

        nome_cliente = dados["cliente_nome"]
        existia = nome_cliente in CLIENTES
        id_cliente = garantir_cliente(nome_cliente, responsavel=dados["solicitante"])
        time.sleep(INTERVALO_ENTRE_REQUISICOES)

        if not id_cliente:
            ignorados += 1
            continue

        if not existia:
            clientes_criados += 1

        motoboy_final, observacao = definir_colaborador(dados["motoboy"])
        rdo_id = proximo_rdo_id()

        if not criar_pedido(rdo_id, dados, id_cliente, motoboy_final, observacao):
            ignorados += 1
            time.sleep(INTERVALO_ENTRE_REQUISICOES)
            continue
        time.sleep(INTERVALO_ENTRE_REQUISICOES)

        criar_chat(rdo_id, id_cliente, dados)
        time.sleep(INTERVALO_ENTRE_REQUISICOES)

        criar_financeiro(rdo_id, dados, motoboy_final, observacao)
        time.sleep(INTERVALO_ENTRE_REQUISICOES)

        inseridos += 1

        if indice % 20 == 0:
            logger.info("Progresso: %d/%d", indice, len(linhas))

    logger.info("Concluído. Pedidos: %d | Clientes novos: %d | Ignorados: %d", inseridos, clientes_criados, ignorados)
    if CLIENTES_PENDENTES:
        logger.warning("Clientes pendentes de CADASTRO MANUAL: %s", sorted(CLIENTES_PENDENTES))

if __name__ == "__main__":
    main()
