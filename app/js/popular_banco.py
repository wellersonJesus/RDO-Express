#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==========================================================
 POPULAR BANCO - CLIENTES + PEDIDOS + CHAT
 RDO Express - Script de carga inteligente
==========================================================
 Recursos:
   - Modo seletivo (escolhe quais tabelas popular)
   - Upsert para clientes (não duplica)
   - Checkpoint de progresso (retoma onde parou)
   - Relatório detalhado ao final
==========================================================
"""

import json
import os
import sys
import time

try:
    import requests
except ImportError:
    print("\n❌ Biblioteca 'requests' não encontrada!")
    print("   Instale com: pip install requests")
    sys.exit(1)

# ──────────────────────────────────────────────
# CONFIGURAÇÕES
# ──────────────────────────────────────────────
API_URL = "https://script.google.com/macros/s/AKfycbzhFNH_HZmj33vgw_JVhnubjPlFfTSymoBJ8Lut0AXUsVxoIVLtMj2xf6ErB9Kv_NXqxA/exec"
API_KEY = "aquieumakdjdddggjrtr"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

ARQUIVO_CLIENTES = os.path.join(BASE_DIR, "dados_clientes.json")
ARQUIVO_PEDIDOS  = os.path.join(BASE_DIR, "dados_pedidos.json")
ARQUIVO_CHAT     = os.path.join(BASE_DIR, "dados_chat.json")

# Arquivo de checkpoint (progresso salvo)
CHECKPOINT_FILE = os.path.join(BASE_DIR, ".popular_checkpoint.json")

# Delay entre requisições (segundos)
DELAY_ENTRE_REQUESTS = 0.4


# ──────────────────────────────────────────────
# CHECKPOINT - SALVAR / CARREGAR PROGRESSO
# ──────────────────────────────────────────────
def carregar_checkpoint():
    """Carrega o progresso salvo (se existir)."""
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {"clientes": 0, "pedidos": 0, "chat": 0}


def salvar_checkpoint(tabela, indice):
    """Salva o progresso atual."""
    cp = carregar_checkpoint()
    cp[tabela] = indice
    try:
        with open(CHECKPOINT_FILE, "w") as f:
            json.dump(cp, f)
    except Exception:
        pass


def limpar_checkpoint():
    """Remove o arquivo de checkpoint."""
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)
        print("  🧹 Checkpoint anterior removido.")


# ──────────────────────────────────────────────
# FUNÇÕES UTILITÁRIAS
# ──────────────────────────────────────────────
def carregar_json(caminho):
    """Carrega um arquivo JSON com tratamento de erros."""
    if not os.path.exists(caminho):
        print(f"  ❌ Arquivo não encontrado: {os.path.basename(caminho)}")
        return None
    try:
        with open(caminho, "r", encoding="utf-8") as f:
            dados = json.load(f)
        print(f"  ✅ {os.path.basename(caminho):.<40} {len(dados):>4} registros")
        return dados
    except json.JSONDecodeError as e:
        print(f"  ❌ JSON inválido em {os.path.basename(caminho)}: {e}")
        return None
    except Exception as e:
        print(f"  ❌ Erro ao ler {os.path.basename(caminho)}: {e}")
        return None


def enviar(action, payload, tentativa=1, max_tentativas=3):
    """Envia dados para a API com retry automático e backoff."""
    payload["action"] = action
    payload["apiKey"] = API_KEY

    try:
        r = requests.post(API_URL, json=payload, timeout=30)
        r.raise_for_status()
        resp = r.json()

        status = resp.get("status", "unknown")
        msg    = resp.get("message", "")
        rec_id = resp.get("id", "")

        if status == "success":
            id_info = f" (id: {rec_id})" if rec_id else ""
            print(f"    ✅ {msg}{id_info}")
        elif status == "exists":
            print(f"    🔄 {msg}")
        else:
            print(f"    ⚠️  [{status}] {msg}")

        return resp

    except requests.exceptions.Timeout:
        print(f"    ⏱️  Timeout (tentativa {tentativa}/{max_tentativas})")
        if tentativa < max_tentativas:
            time.sleep(2 * tentativa)
            return enviar(action, payload, tentativa + 1, max_tentativas)
        print(f"    ❌ Timeout após {max_tentativas} tentativas")
        return None

    except requests.exceptions.RequestException as e:
        print(f"    ❌ Erro HTTP: {e}")
        if tentativa < max_tentativas:
            time.sleep(2 * tentativa)
            return enviar(action, payload, tentativa + 1, max_tentativas)
        return None

    except json.JSONDecodeError:
        print(f"    ❌ Resposta não é JSON: {r.text[:200]}")
        return None


# ──────────────────────────────────────────────
# POPULAR CLIENTES (UPSERT)
# ──────────────────────────────────────────────
def popular_clientes(dados, inicio_em=0):
    """
    Popula CLIENTES usando upsert.
    - Se o cliente já existe → atualiza
    - Se não existe → insere
    """
    print(f"\n{'='*55}")
    print("👥 POPULANDO TABELA: CLIENTES (modo UPSERT)")
    print(f"{'='*55}")

    if inicio_em > 0:
        print(f"  ⏩ Retomando a partir do registro {inicio_em + 1}")

    sucesso = 0
    erros   = 0

    for i, c in enumerate(dados):
        if i < inicio_em:
            continue

        # Validação: garantir que é um dicionário
        if not isinstance(c, dict):
            print(f"\n  [{i+1}/{len(dados)}] ⚠️  Registro ignorado (tipo: {type(c).__name__})")
            erros += 1
            salvar_checkpoint("clientes", i + 1)
            continue

        idx  = i + 1
        nome = c.get("username", "N/A")
        cid  = c.get("id", "N/A")
        print(f"\n  [{idx}/{len(dados)}] {nome} ({cid})")

        resp = enviar("addcliente", {
            "id":          c.get("id", ""),
            "username":    c.get("username", ""),
            "responsavel": c.get("responsavel", ""),
            "contato":     c.get("contato", ""),
            "status":      c.get("status", "")
        })

        if resp and resp.get("status") in ("success", "exists"):
            sucesso += 1
        else:
            erros += 1

        salvar_checkpoint("clientes", i + 1)
        time.sleep(DELAY_ENTRE_REQUESTS)

    return sucesso, erros


# ──────────────────────────────────────────────
# POPULAR PEDIDOS
# ──────────────────────────────────────────────
def popular_pedidos(dados, inicio_em=0):
    """Popula a tabela PEDIDOS."""
    print(f"\n{'='*55}")
    print("📦 POPULANDO TABELA: PEDIDOS")
    print(f"{'='*55}")

    if inicio_em > 0:
        print(f"  ⏩ Retomando a partir do registro {inicio_em + 1}")

    sucesso = 0
    erros   = 0

    for i, p in enumerate(dados):
        if i < inicio_em:
            continue

        # Validação: garantir que é um dicionário
        if not isinstance(p, dict):
            print(f"\n  [{i+1}/{len(dados)}] ⚠️  Registro ignorado (tipo: {type(p).__name__})")
            erros += 1
            salvar_checkpoint("pedidos", i + 1)
            continue

        idx = i + 1
        pid = p.get("id", "N/A")
        cli = p.get("id_cliente", "N/A")
        print(f"\n  [{idx}/{len(dados)}] {pid} → Cliente: {cli}")

        resp = enviar("addpedido", {
            "id":            p.get("id", ""),
            "id_cliente":    p.get("id_cliente", ""),
            "solicitante":   p.get("solicitante", ""),
            "contato":       p.get("contato", ""),
            "horario":       p.get("horario", ""),
            "mercadoria":    p.get("mercadoria", ""),
            "de":            p.get("de", ""),
            "para":          p.get("para", ""),
            "retorno":       p.get("retorno", ""),
            "prioridade":    p.get("prioridade", ""),
            "valor_corrida": p.get("valor_corrida", ""),
            "motoboy":       p.get("motoboy", ""),
            "status":        p.get("status", ""),
            "observacao":    p.get("observacao", "")
        })

        if resp and resp.get("status") in ("success", "exists"):
            sucesso += 1
        else:
            erros += 1

        salvar_checkpoint("pedidos", i + 1)
        time.sleep(DELAY_ENTRE_REQUESTS)

    return sucesso, erros


# ──────────────────────────────────────────────
# POPULAR CHAT (COM VALIDAÇÃO ROBUSTA)
# ──────────────────────────────────────────────
def popular_chat(dados, inicio_em=0):
    """Popula tabela CHAT com validação robusta contra registros inválidos."""
    print(f"\n{'='*55}")
    print("💬 POPULANDO TABELA: CHAT")
    print(f"{'='*55}")

    if inicio_em > 0:
        print(f"  ⏩ Retomando a partir do registro {inicio_em + 1}")

    sucesso = 0
    erros   = 0
    total   = len(dados)

    for i in range(inicio_em, total):
        m = dados[i]

        # ── Validação: garantir que é um dicionário ──
        if not isinstance(m, dict):
            print(f"\n  [{i+1}/{total}] ⚠️  Registro ignorado (tipo inválido: {type(m).__name__})")
            erros += 1
            salvar_checkpoint("chat", i + 1)
            continue

        mid = m.get("id", "N/A")
        ped = m.get("pedido_id", "N/A")

        # Truncar ID longo para exibição no log
        mid_display = mid[:8] + "..." if len(str(mid)) > 8 else mid
        print(f"\n  [{i+1}/{total}] Chat #{mid_display} → Pedido: {ped}")

        resp = enviar("addchat", {
            "id":         m.get("id", ""),
            "id_cliente": m.get("id_cliente", ""),
            "pedido_id":  m.get("pedido_id", ""),
            "texto":      m.get("texto", ""),
            "hora":       m.get("hora", ""),
            "data":       m.get("data", ""),
            "finalizado": m.get("finalizado", "CONCLUIDO")
        })

        if resp and resp.get("status") in ("success", "exists"):
            sucesso += 1
        else:
            erros += 1

        salvar_checkpoint("chat", i + 1)
        time.sleep(DELAY_ENTRE_REQUESTS)

    return sucesso, erros


# ──────────────────────────────────────────────
# MENU INTERATIVO
# ──────────────────────────────────────────────
def exibir_menu():
    """Exibe menu de opções para o usuário."""
    print(f"\n{'─'*55}")
    print("📌 O QUE DESEJA POPULAR?")
    print(f"{'─'*55}")
    print("  [1] 👥 Somente CLIENTES (upsert - atualiza/insere)")
    print("  [2] 📦 Somente PEDIDOS")
    print("  [3] 💬 Somente CHAT")
    print("  [4] 👥+💬 CLIENTES + CHAT (recomendado para seu caso)")
    print("  [5] 🔄 TUDO (Clientes + Pedidos + Chat)")
    print("  [6] 🔄 RETOMAR do checkpoint anterior")
    print("  [0] ❌ Sair")
    print(f"{'─'*55}")

    while True:
        escolha = input("\n▶️  Escolha uma opção (0-6): ").strip()
        if escolha in ("0", "1", "2", "3", "4", "5", "6"):
            return int(escolha)
        print("  ⚠️  Opção inválida. Tente novamente.")


# ──────────────────────────────────────────────
# FUNÇÃO PRINCIPAL
# ──────────────────────────────────────────────
def main():
    print("=" * 55)
    print("🚀 POPULAR BANCO - RDO Express")
    print("   Carga Inteligente (Clientes + Pedidos + Chat)")
    print("=" * 55)

    # ── Carregar os 3 arquivos JSON ──
    print(f"\n📂 Carregando arquivos de: {BASE_DIR}\n")

    clientes = carregar_json(ARQUIVO_CLIENTES)
    pedidos  = carregar_json(ARQUIVO_PEDIDOS)
    chat     = carregar_json(ARQUIVO_CHAT)

    # Substituir None por lista vazia
    clientes = clientes or []
    pedidos  = pedidos or []
    chat     = chat or []

    # ── Resumo ──
    print(f"\n{'─'*55}")
    print(f"📊 RESUMO DOS DADOS:")
    print(f"   👥 Clientes .... {len(clientes):>4} registros")
    print(f"   📦 Pedidos ..... {len(pedidos):>4} registros")
    print(f"   💬 Chat ........ {len(chat):>4} registros")
    total = len(clientes) + len(pedidos) + len(chat)
    print(f"   {'─'*40}")
    print(f"   📁 Total ....... {total:>4} registros")
    print(f"{'─'*55}")

    if total == 0:
        print("\n❌ Nenhum dado encontrado. Verifique os arquivos JSON.")
        sys.exit(1)

    # ── Verificar checkpoint existente ──
    cp = carregar_checkpoint()
    has_checkpoint = any(v > 0 for v in cp.values())

    if has_checkpoint:
        print(f"\n⏸️  CHECKPOINT ENCONTRADO:")
        print(f"   👥 Clientes: {cp['clientes']} enviados")
        print(f"   📦 Pedidos:  {cp['pedidos']} enviados")
        print(f"   💬 Chat:     {cp['chat']} enviados")

    # ── Menu ──
    opcao = exibir_menu()

    if opcao == 0:
        print("\n⛔ Operação cancelada.")
        sys.exit(0)

    # ── Determinar o que popular ──
    fazer_clientes  = False
    fazer_pedidos   = False
    fazer_chat      = False
    usar_checkpoint = False

    if opcao == 1:
        fazer_clientes = True
    elif opcao == 2:
        fazer_pedidos = True
    elif opcao == 3:
        fazer_chat = True
    elif opcao == 4:
        fazer_clientes = True
        fazer_chat = True
    elif opcao == 5:
        fazer_clientes = True
        fazer_pedidos = True
        fazer_chat = True
    elif opcao == 6:
        usar_checkpoint = True
        fazer_clientes = cp["clientes"] < len(clientes)
        fazer_pedidos  = cp["pedidos"] < len(pedidos)
        fazer_chat     = cp["chat"] < len(chat)

    # ── Limpar checkpoint se não for retomada ──
    if not usar_checkpoint:
        limpar_checkpoint()
        cp = {"clientes": 0, "pedidos": 0, "chat": 0}

    # ── Calcular estimativa de tempo ──
    total_enviar = 0
    if fazer_clientes:
        total_enviar += len(clientes) - cp["clientes"]
    if fazer_pedidos:
        total_enviar += len(pedidos) - cp["pedidos"]
    if fazer_chat:
        total_enviar += len(chat) - cp["chat"]

    tempo_est = total_enviar * DELAY_ENTRE_REQUESTS / 60

    print(f"\n{'─'*55}")
    print(f"📋 PLANO DE EXECUÇÃO:")
    if fazer_clientes:
        restante = len(clientes) - cp["clientes"]
        print(f"   👥 Clientes: {restante} a enviar")
    if fazer_pedidos:
        restante = len(pedidos) - cp["pedidos"]
        print(f"   📦 Pedidos:  {restante} a enviar")
    if fazer_chat:
        restante = len(chat) - cp["chat"]
        print(f"   💬 Chat:     {restante} a enviar")
    print(f"   ⏱️  Tempo estimado: ~{tempo_est:.1f} min ({total_enviar} requests)")
    print(f"{'─'*55}")

    confirm = input("\n▶️  Confirma o envio? (s/n): ").strip().lower()
    if confirm not in ("s", "sim", "y", "yes"):
        print("\n⛔ Cancelado.")
        sys.exit(0)

    # ── EXECUTAR ──
    inicio = time.time()

    resultado = {
        "clientes": {"sucesso": 0, "erros": 0},
        "pedidos":  {"sucesso": 0, "erros": 0},
        "chat":     {"sucesso": 0, "erros": 0}
    }

    # 1) CLIENTES
    if fazer_clientes and clientes:
        s, e = popular_clientes(clientes, inicio_em=cp["clientes"])
        resultado["clientes"] = {"sucesso": s, "erros": e}

    # 2) PEDIDOS
    if fazer_pedidos and pedidos:
        s, e = popular_pedidos(pedidos, inicio_em=cp["pedidos"])
        resultado["pedidos"] = {"sucesso": s, "erros": e}

    # 3) CHAT
    if fazer_chat and chat:
        s, e = popular_chat(chat, inicio_em=cp["chat"])
        resultado["chat"] = {"sucesso": s, "erros": e}

    # ── Relatório Final ──
    fim = time.time()
    duracao = fim - inicio

    print(f"\n{'='*55}")
    print("🏁 PROCESSO FINALIZADO!")
    print(f"{'='*55}")

    total_sucesso = 0
    total_erros   = 0

    for tabela, label, icon in [
        ("clientes", "CLIENTES", "👥"),
        ("pedidos",  "PEDIDOS",  "📦"),
        ("chat",     "CHAT",     "💬")
    ]:
        s = resultado[tabela]["sucesso"]
        e = resultado[tabela]["erros"]
        total_sucesso += s
        total_erros   += e

        if s + e > 0:
            print(f"\n  {icon} {label}:")
            print(f"     ✅ Sucesso: {s}")
            if e > 0:
                print(f"     ❌ Erros:   {e}")

    print(f"\n  {'─'*45}")
    print(f"  📊 TOTAL: {total_sucesso} sucesso | {total_erros} erros")
    print(f"  ⏱️  Duração: {duracao:.1f}s ({duracao/60:.1f} min)")
    print(f"{'='*55}")

    # ── Limpar checkpoint se tudo OK ──
    if total_erros == 0:
        limpar_checkpoint()
        print(f"\n🎉 Tudo certo! Todos os registros foram enviados!")
    else:
        print(f"\n⚠️  {total_erros} erros. Use opção [6] para retomar.")
        print(f"   Checkpoint salvo em: {CHECKPOINT_FILE}")

    sys.exit(1 if total_erros > 0 else 0)


if __name__ == "__main__":
    main()
