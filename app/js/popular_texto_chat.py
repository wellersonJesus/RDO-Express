#!/usr/bin/env python3
"""
popular_chat.py (v2 - Resiliente)
Continua de onde parou. Retry automático + delay entre requests.
"""

import requests
import json
import sys
import time
from datetime import datetime

# ─── CONFIGURAÇÃO ───────────────────────────────────────────────
API_URL = "https://script.google.com/macros/s/AKfycbzhFNH_HZmj33vgw_JVhnubjPlFfTSymoBJ8Lut0AXUsVxoIVLtMj2xf6ErB9Kv_NXqxA/exec"
API_KEY = "aquieumakdjdddggjrtr"

# Controle de execução
DELAY_ENTRE_REQUESTS = 1.5   # segundos entre cada insert
MAX_RETRIES = 5               # tentativas por requisição
RETRY_DELAY = 10              # segundos de espera entre retries
TIMEOUT = 60                  # timeout da requisição (aumentado)
# ────────────────────────────────────────────────────────────────


def api_call(payload, tentativa=1):
    """Faz POST com retry automático."""
    payload["apiKey"] = API_KEY
    try:
        resp = requests.post(
            API_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        resp.raise_for_status()
        return resp.json()
    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
        if tentativa <= MAX_RETRIES:
            espera = RETRY_DELAY * tentativa
            print(f"\n   ⏳ Timeout/Conexão (tentativa {tentativa}/{MAX_RETRIES}). Aguardando {espera}s...")
            time.sleep(espera)
            return api_call(payload, tentativa + 1)
        else:
            print(f"\n   ❌ Falha após {MAX_RETRIES} tentativas: {e}")
            return None
    except requests.exceptions.RequestException as e:
        if tentativa <= MAX_RETRIES:
            espera = RETRY_DELAY * tentativa
            print(f"\n   ⚠️ Erro HTTP (tentativa {tentativa}/{MAX_RETRIES}). Aguardando {espera}s...")
            time.sleep(espera)
            return api_call(payload, tentativa + 1)
        else:
            print(f"\n   ❌ Falha após {MAX_RETRIES} tentativas: {e}")
            return None
    except json.JSONDecodeError:
        print(f"\n   ❌ Resposta não é JSON: {resp.text[:200]}")
        return None


def buscar_pedidos():
    print("📦 Buscando pedidos...")
    resultado = api_call({"action": "getpedidos"})
    if isinstance(resultado, list):
        print(f"   ✅ {len(resultado)} pedido(s) encontrado(s)")
        return resultado
    if isinstance(resultado, dict) and resultado.get("status") == "error":
        print(f"   ❌ Erro: {resultado.get('message')}")
        return []
    print("   ⚠️  Resposta inesperada:", resultado)
    return []


def buscar_chats_existentes():
    print("💬 Verificando chats existentes...")
    resultado = api_call({"action": "getchat"})
    if isinstance(resultado, list):
        ids = set()
        for chat in resultado:
            pid = str(chat.get("pedido_id", "")).strip()
            if pid:
                ids.add(pid)
        print(f"   ✅ {len(ids)} chat(s) já existente(s)")
        return ids
    return set()


def montar_rotas(de_str, para_str):
    separador = ";"
    origens = [o.strip() for o in str(de_str).split(separador) if o.strip()]
    destinos = [d.strip() for d in str(para_str).split(separador) if d.strip()]

    if len(origens) <= 1 and len(destinos) <= 1:
        origens_v2 = [o.strip() for o in str(de_str).split(",") if o.strip()]
        destinos_v2 = [d.strip() for d in str(para_str).split(",") if d.strip()]
        if len(origens_v2) == len(destinos_v2) and len(origens_v2) > 1:
            origens = origens_v2
            destinos = destinos_v2

    max_rotas = max(len(origens), len(destinos))
    while len(origens) < max_rotas:
        origens.append("N/A")
    while len(destinos) < max_rotas:
        destinos.append("N/A")

    linhas = []
    for i in range(max_rotas):
        num = i + 1
        linhas.append(
            f"📍{num}. De: {origens[i]} | \n"
            f"        Para: {destinos[i]}"
        )
    return "\n".join(linhas)


def montar_mensagem(pedido):
    pid       = str(pedido.get("id", "")).strip()
    solic     = str(pedido.get("solicitante", "")).strip() or "N/A"
    contato   = str(pedido.get("contato", "")).strip() or "N/A"
    horario   = str(pedido.get("horario", "")).strip() or "N/A"
    mercad    = str(pedido.get("mercadoria", "")).strip() or "N/A"
    retorno   = str(pedido.get("retorno", "")).strip() or "N/A"
    de_str    = str(pedido.get("de", "")).strip()
    para_str  = str(pedido.get("para", "")).strip()
    obs       = str(pedido.get("observacao", "")).strip() or "N/A"
    valor     = str(pedido.get("valor_corrida", "")).strip() or "N/A"

    rotas_bloco = montar_rotas(de_str, para_str)

    mensagem = (
        f"N.SERVIÇO: {pid}\n"
        f"SOLICITANTE: {solic}\n"
        f"CONTATO: {contato} | HR: {horario}\n"
        f"-\n"
        f"MERCADORIA: {mercad}\n"
        f"RETORNO: {retorno}\n"
        f"-\n"
        f"ROTA(s):\n"
        f"{rotas_bloco}\n"
        f"-\n"
        f"OBSERVAÇÃO: {obs}\n"
        f"R$ {valor}"
    )
    return mensagem


def inserir_chat(id_cliente, pedido_id, texto):
    agora = datetime.now()
    hora = agora.strftime("%H:%M")
    data = agora.strftime("%d/%m/%Y")

    payload = {
        "action": "addchat",
        "id_cliente": str(id_cliente).strip(),
        "pedido_id": str(pedido_id).strip(),
        "texto": texto,
        "hora": hora,
        "data": data,
        "finalizado": "TRUE"
    }

    resultado = api_call(payload)

    if resultado and isinstance(resultado, dict) and resultado.get("status") == "success":
        return True
    elif resultado is None:
        return False
    else:
        print(f"   ❌ Resposta inesperada: {resultado}")
        return False


def main():
    print("=" * 55)
    print("  🚀 POPULAR CHAT v2 (Resiliente)")
    print("=" * 55)
    print()

    # 1. Buscar pedidos
    pedidos = buscar_pedidos()
    if not pedidos:
        print("\n⚠️  Nenhum pedido encontrado.")
        return

    # 2. Buscar chats existentes (evitar duplicatas)
    chats_existentes = buscar_chats_existentes()

    # 3. Filtrar pendentes
    pedidos_novos = [
        p for p in pedidos
        if str(p.get("id", "")).strip() not in chats_existentes
    ]

    total = len(pedidos)
    ja_tem = total - len(pedidos_novos)
    pendentes = len(pedidos_novos)

    print(f"\n📊 Resumo:")
    print(f"   Total de pedidos:      {total}")
    print(f"   Já possuem chat:       {ja_tem}")
    print(f"   Pendentes (a inserir): {pendentes}")
    print()

    if not pedidos_novos:
        print("✅ Todos os pedidos já possuem chat!")
        return

    # Estimativa de tempo
    tempo_est = pendentes * (DELAY_ENTRE_REQUESTS + 1)
    minutos = int(tempo_est // 60)
    segundos = int(tempo_est % 60)
    print(f"⏱️  Tempo estimado: ~{minutos}min {segundos}s")
    print(f"   (delay de {DELAY_ENTRE_REQUESTS}s entre requests)")
    print()

    # 4. Inserir chats
    sucesso = 0
    falha = 0
    falhas_ids = []

    for i, pedido in enumerate(pedidos_novos, 1):
        pid = str(pedido.get("id", "")).strip()
        id_cliente = str(pedido.get("id_cliente", "")).strip()

        print(f"[{i}/{pendentes}] Inserindo chat para {pid}...", end=" ")

        texto = montar_mensagem(pedido)
        ok = inserir_chat(id_cliente, pid, texto)

        if ok:
            print("✅")
            sucesso += 1
        else:
            print("❌")
            falha += 1
            falhas_ids.append(pid)

        # Delay entre requests (evita sobrecarregar o Apps Script)
        if i < pendentes:
            time.sleep(DELAY_ENTRE_REQUESTS)

    # 5. Resultado final
    print()
    print("=" * 55)
    print(f"  ✅ Inseridos: {sucesso}  |  ❌ Falhas: {falha}")
    print("=" * 55)

    if falhas_ids:
        print(f"\n⚠️  IDs com falha (rode novamente para tentar):")
        print(f"   {', '.join(falhas_ids)}")
        print(f"\n💡 Basta rodar o script de novo — ele pula os já inseridos!")


if __name__ == "__main__":
    main()
