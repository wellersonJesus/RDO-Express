#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================
  POPULAR BANCO - RDO Express
  Envia pedidos + chat para o Google Sheets
  via Apps Script (doPost)
=============================================
"""

import json
import time
import urllib.request
import urllib.error
import sys
import os
from datetime import datetime

# ============================================================
# 🔧 CONFIGURAÇÃO - PREENCHA AQUI
# ============================================================

# URL do Web App (Apps Script) — pegue no Google Apps Script > Deploy > Web App
WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzhFNH_HZmj33vgw_JVhnubjPlFfTSymoBJ8Lut0AXUsVxoIVLtMj2xf6ErB9Kv_NXqxA/exec"

# Chave de API (mesma SECRET_KEY do seu Apps Script)
API_KEY = "aquieumakdjdddggjrtr"

# Caminho do arquivo de dados
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DADOS_FILE = os.path.join(SCRIPT_DIR, "dados_pedidos.json")

# Intervalo entre requisições (segundos) — evita limite de rate do Google
INTERVALO = 1.5

# Popular também a aba chat? (True/False)
POPULAR_CHAT = True

# ============================================================
# 🚀 FUNÇÕES
# ============================================================

def enviar_post(url, payload):
    """Envia POST para o Apps Script e retorna o JSON de resposta."""
    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        response = urllib.request.urlopen(req, timeout=30)
        body = response.read().decode("utf-8")
        return json.loads(body)
    except urllib.error.HTTPError as e:
        if e.code in (301, 302, 303, 307, 308):
            redirect_url = e.headers.get("Location")
            if redirect_url:
                req2 = urllib.request.Request(redirect_url, method="GET")
                resp2 = urllib.request.urlopen(req2, timeout=30)
                body = resp2.read().decode("utf-8")
                return json.loads(body)
        return {"status": "error", "message": f"HTTP {e.code}: {e.reason}"}
    except Exception as ex:
        return {"status": "error", "message": str(ex)}


def enviar_pedido(url, api_key, pedido):
    """Envia um pedido via action 'addpedido'."""
    payload = {
        "action": "addpedido",
        "apiKey": api_key,
        "id_chat": pedido.get("id_chat", ""),
        "solicitante": pedido.get("solicitante", ""),
        "contato": pedido.get("contato", ""),
        "horario": pedido.get("horario", ""),
        "mercadoria": pedido.get("mercadoria", ""),
        "de": pedido.get("de", ""),
        "para": pedido.get("para", ""),
        "retorno": pedido.get("retorno", ""),
        "prioridade": pedido.get("prioridade", "N/A"),
        "valor_corrida": pedido.get("valor_corrida", ""),
        "observacao": pedido.get("observacao", "")
    }
    return enviar_post(url, payload)


def enviar_chat(url, api_key, id_cliente, pedido_id, solicitante, mercadoria):
    """
    Envia uma entrada de chat via action 'addchat'.
    Ordem dos campos segue os HEADERS da aba chat:
    id | pedido_id | texto | hora | data | finalizado
    """
    agora = datetime.now()
    hora_str = agora.strftime("%H:%M")
    data_str = agora.strftime("%d/%m/%Y")

    texto = (
        f"✅ Pedido {pedido_id} finalizado.\n"
        f"Solicitante: {solicitante}\n"
        f"Mercadoria: {mercadoria}"
    )

    payload = {
        "action": "addchat",
        "apiKey": api_key,
        "id": id_cliente,
        "pedido_id": pedido_id,
        "texto": texto,
        "hora": hora_str,
        "data": data_str,
        "finalizado": "TRUE"
    }
    return enviar_post(url, payload)


def main():
    print("=" * 60)
    print("  🚀 POPULAR BANCO - RDO Express")
    print("  Enviando pedidos para Google Sheets via Apps Script")
    print("=" * 60)
    print()

    # Verificar URL
    if WEBAPP_URL == "COLE_SUA_URL_AQUI":
        print("❌ ERRO: Você precisa configurar a WEBAPP_URL!")
        print("   Abra o arquivo popular_banco.py e cole a URL do seu Web App.")
        print("   (Google Apps Script > Deploy > Web App > copiar URL)")
        sys.exit(1)

    # Carregar dados
    if not os.path.exists(DADOS_FILE):
        print(f"❌ ERRO: Arquivo não encontrado: {DADOS_FILE}")
        sys.exit(1)

    with open(DADOS_FILE, "r", encoding="utf-8") as f:
        pedidos = json.load(f)

    total = len(pedidos)
    etapas = total * 2 if POPULAR_CHAT else total
    tempo_est = etapas * INTERVALO

    print(f"📂 Arquivo: {DADOS_FILE}")
    print(f"📋 Total de pedidos: {total}")
    print(f"💬 Popular aba chat: {'SIM' if POPULAR_CHAT else 'NÃO'}")
    print(f"📨 Total de requisições: {etapas}")
    print(f"⏱️  Intervalo entre envios: {INTERVALO}s")
    print(f"⏳ Tempo estimado: ~{int(tempo_est / 60)} min {int(tempo_est % 60)}s")
    print()

    resp = input("▶️  Deseja continuar? (s/n): ").strip().lower()
    if resp not in ("s", "sim", "y", "yes"):
        print("❌ Operação cancelada.")
        sys.exit(0)

    print()
    print("-" * 60)
    print("  📦 ETAPA 1: Inserindo PEDIDOS")
    print("-" * 60)

    sucesso_ped = 0
    erros_ped = 0
    erros_lista = []
    pedidos_inseridos = []  # guarda (id_chat, pedido_id, solicitante, mercadoria)

    for i, pedido in enumerate(pedidos, 1):
        solicitante = pedido.get("solicitante", "?")
        mercadoria = pedido.get("mercadoria", "?")
        id_chat = pedido.get("id_chat", "?")

        sys.stdout.write(
            f"\r📤 Enviando pedido {i}/{total} — {solicitante} | {mercadoria}...".ljust(80)
        )
        sys.stdout.flush()

        result = enviar_pedido(WEBAPP_URL, API_KEY, pedido)

        if isinstance(result, dict) and result.get("status") == "success":
            sucesso_ped += 1
            id_gerado = result.get("id", "?")
            pedidos_inseridos.append((id_chat, id_gerado, solicitante, mercadoria))
            sys.stdout.write(
                f"\r✅ {i}/{total} — {id_gerado} | {solicitante} | {mercadoria}".ljust(80) + "\n"
            )
        else:
            erros_ped += 1
            msg = result.get("message", str(result)) if isinstance(result, dict) else str(result)
            erros_lista.append({"num": i, "solicitante": solicitante, "erro": msg})
            sys.stdout.write(
                f"\r❌ {i}/{total} — ERRO: {msg}".ljust(80) + "\n"
            )

        if i < total or POPULAR_CHAT:
            time.sleep(INTERVALO)

    # ── ETAPA 2: CHAT ──
    sucesso_chat = 0
    erros_chat = 0

    if POPULAR_CHAT and pedidos_inseridos:
        print()
        print("-" * 60)
        print("  💬 ETAPA 2: Inserindo CHAT")
        print("-" * 60)

        total_chat = len(pedidos_inseridos)

        for j, (id_chat, pedido_id, solicitante, mercadoria) in enumerate(pedidos_inseridos, 1):
            sys.stdout.write(
                f"\r💬 Enviando chat {j}/{total_chat} — {pedido_id} | {solicitante}...".ljust(80)
            )
            sys.stdout.flush()

            result = enviar_chat(WEBAPP_URL, API_KEY, id_chat, pedido_id, solicitante, mercadoria)

            if isinstance(result, dict) and result.get("status") == "success":
                sucesso_chat += 1
                sys.stdout.write(
                    f"\r✅ {j}/{total_chat} — Chat {pedido_id} | {solicitante}".ljust(80) + "\n"
                )
            else:
                erros_chat += 1
                msg = result.get("message", str(result)) if isinstance(result, dict) else str(result)
                sys.stdout.write(
                    f"\r❌ {j}/{total_chat} — ERRO chat: {msg}".ljust(80) + "\n"
                )

            if j < total_chat:
                time.sleep(INTERVALO)

    # ── RESUMO ──
    print()
    print("=" * 60)
    print("  📊 RESUMO FINAL")
    print("=" * 60)
    print(f"  📦 Pedidos:  ✅ {sucesso_ped}/{total}  |  ❌ {erros_ped}/{total}")
    if POPULAR_CHAT:
        print(f"  💬 Chat:     ✅ {sucesso_chat}/{len(pedidos_inseridos)}  |  ❌ {erros_chat}/{len(pedidos_inseridos)}")

    if erros_lista:
        print()
        print("  ⚠️  Pedidos com erro:")
        for err in erros_lista:
            print(f"     #{err['num']} - {err['solicitante']}: {err['erro']}")

    print()
    print("🏁 Finalizado!")


if __name__ == "__main__":
    main()
