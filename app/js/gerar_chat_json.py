#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==========================================================
 GERAR dados_chat.json A PARTIR DE dados_pedidos.json
 RDO Express — Versão Refatorada v2
==========================================================
 Lê dados_pedidos.json e gera 1 registro de chat por
 pedido, com:
   - id:         até 11 caracteres aleatórios únicos
   - id_cliente: herdado do pedido
   - pedido_id:  número do serviço (RDO01, RDO02...)
   - texto:      card formatado padrão
   - hora:       horário do pedido
   - data:       data do pedido (ou data atual se ausente)
   - finalizado: "CONCLUIDO"
==========================================================
"""

import json
import os
import random
import string
import sys
from datetime import datetime


# ──────────────────────────────────────────────
# CONFIGURAÇÕES
# ──────────────────────────────────────────────
BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
ARQUIVO_PEDIDOS = os.path.join(BASE_DIR, "dados_pedidos.json")
ARQUIVO_CHAT    = os.path.join(BASE_DIR, "dados_chat.json")

# Data de fallback (hoje) no formato DD/MM/AAAA
DATA_FALLBACK = datetime.now().strftime("%d/%m/%Y")

# Campos possíveis que podem conter a data no JSON de pedidos
# (o script tenta cada um na ordem até achar)
CAMPOS_DATA = ["data", "data_pedido", "date", "dt_pedido", "created_at"]


# ──────────────────────────────────────────────
# FUNÇÕES UTILITÁRIAS
# ──────────────────────────────────────────────

def gerar_id_chat(tamanho=11):
    """Gera ID aleatório alfanumérico de até 11 caracteres."""
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=tamanho))


def gerar_ids_unicos(quantidade, tamanho=11):
    """Gera uma lista de IDs únicos sem repetição."""
    ids = set()
    tentativas = 0
    max_tentativas = quantidade * 10
    while len(ids) < quantidade and tentativas < max_tentativas:
        ids.add(gerar_id_chat(tamanho))
        tentativas += 1
    if len(ids) < quantidade:
        print(f"  ⚠️  Só foi possível gerar {len(ids)} IDs únicos de {quantidade}")
    return list(ids)


def extrair_data(pedido):
    """
    Extrai a data do pedido tentando múltiplos campos.
    Retorna no formato DD/MM/AAAA.
    Se nenhum campo for encontrado, usa a data de hoje.
    """
    for campo in CAMPOS_DATA:
        valor = pedido.get(campo)
        if valor and str(valor).strip():
            valor = str(valor).strip()

            # Se já estiver no formato DD/MM/AAAA, retorna direto
            if len(valor) == 10 and valor[2] == "/" and valor[5] == "/":
                return valor

            # Se estiver no formato AAAA-MM-DD (ISO)
            if len(valor) >= 10 and valor[4] == "-" and valor[7] == "-":
                try:
                    dt = datetime.strptime(valor[:10], "%Y-%m-%d")
                    return dt.strftime("%d/%m/%Y")
                except ValueError:
                    pass

            # Se estiver no formato DD-MM-AAAA
            if len(valor) == 10 and valor[2] == "-" and valor[5] == "-":
                try:
                    dt = datetime.strptime(valor, "%d-%m-%Y")
                    return dt.strftime("%d/%m/%Y")
                except ValueError:
                    pass

            # Qualquer outro formato, tenta retornar como está
            return valor

    return DATA_FALLBACK


def formatar_valor(valor):
    """Formata o valor da corrida como R$ XX,XX."""
    if valor is None:
        return ""
    if isinstance(valor, str):
        # Remove R$, espaços, e troca ponto por vírgula se necessário
        limpo = valor.replace("R$", "").replace(" ", "").strip()
        if limpo:
            try:
                num = float(limpo.replace(",", "."))
                return f"R$ {num:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            except ValueError:
                return f"R$ {limpo}"
        return ""
    if isinstance(valor, (int, float)):
        return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return str(valor)


def formatar_texto_chat(p):
    """
    Formata o texto do chat no padrão do card do pedido.
    Monta o texto completo igual ao modelo de mensagem do RDO.
    """
    solicitante = p.get("solicitante", "N/A")
    pedido_id   = p.get("id", "N/A")
    contato     = p.get("contato", "N/A")
    horario     = p.get("horario", "N/A")
    mercadoria  = p.get("mercadoria", "N/A")
    retorno     = p.get("retorno", "Não")
    prioridade  = p.get("prioridade", "NORMAL")
    motoboy     = p.get("motoboy", "N/A")
    valor       = p.get("valor_corrida", p.get("valor", ""))
    obs         = p.get("observacao", p.get("obs", ""))

    # ── Rotas ──
    de_local   = p.get("de", p.get("origem", "N/A"))
    para_local = p.get("para", p.get("destino", "N/A"))

    # Suporte a múltiplas rotas (se existir campo "rotas")
    rotas = p.get("rotas", None)
    if rotas and isinstance(rotas, list):
        rotas_texto = ""
        for idx, rota in enumerate(rotas, 1):
            de_r   = rota.get("de", rota.get("origem", "N/A"))
            para_r = rota.get("para", rota.get("destino", "N/A"))
            rotas_texto += f"📍{idx}. De: {de_r} | Para: {para_r}\n"
        rotas_texto = rotas_texto.rstrip("\n")
    else:
        rotas_texto = f"📍1. De: {de_local} | Para: {para_local}"

    # ── Montar bloco de observação ──
    partes_obs = []
    if obs and str(obs).strip():
        partes_obs.append(str(obs).strip())
    if prioridade:
        partes_obs.append(f"PRIORIDADE: {prioridade}")
    if motoboy and motoboy != "N/A":
        partes_obs.append(f"MOTOBOY: {motoboy}")

    linha_obs = " | ".join(partes_obs) if partes_obs else "Sem observações"

    # ── Valor formatado ──
    valor_fmt = formatar_valor(valor)

    # ── Montar texto final ──
    texto = (
        f"📦 SOLICITANTE: {solicitante}\n"
        f"\n"
        f"N.SERVIÇO: {pedido_id}\n"
        f"SOLICITANTE: {solicitante}\n"
        f"CONTATO: {contato} | HR: {horario}\n"
        f"-\n"
        f"MERCADORIA: {mercadoria}\n"
        f"RETORNO: {retorno}\n"
        f"-\n"
        f"ROTA(s):\n"
        f"{rotas_texto}\n"
        f"-\n"
        f"OBSERVAÇÃO: {linha_obs}"
    )

    if valor_fmt:
        texto += f"\n{valor_fmt}"

    return texto


# ──────────────────────────────────────────────
# VALIDAÇÃO DO JSON GERADO
# ──────────────────────────────────────────────

def validar_registros(registros):
    """Valida se todos os registros estão corretos."""
    erros = []
    ids_vistos = set()

    for i, reg in enumerate(registros):
        # Tipo correto?
        if not isinstance(reg, dict):
            erros.append(f"  ❌ Registro [{i}] não é um dicionário (é {type(reg).__name__})")
            continue

        # ID único?
        chat_id = reg.get("id", "")
        if chat_id in ids_vistos:
            erros.append(f"  ❌ Registro [{i}] ID duplicado: {chat_id}")
        ids_vistos.add(chat_id)

        # ID tamanho correto?
        if len(chat_id) != 11:
            erros.append(f"  ⚠️  Registro [{i}] ID com {len(chat_id)} chars (esperado: 11)")

        # Campos obrigatórios presentes?
        for campo in ["id", "id_cliente", "pedido_id", "texto", "hora", "data", "finalizado"]:
            if campo not in reg:
                erros.append(f"  ❌ Registro [{i}] campo '{campo}' ausente")

        # Status correto?
        if reg.get("finalizado") != "CONCLUIDO":
            erros.append(f"  ⚠️  Registro [{i}] finalizado = '{reg.get('finalizado')}' (esperado: CONCLUIDO)")

    return erros


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────

def main():
    print()
    print("=" * 60)
    print("  🔧 GERADOR DE dados_chat.json")
    print("     A partir de dados_pedidos.json")
    print("     RDO Express — v2 (com data + validação)")
    print("=" * 60)

    # ── 1. Carregar pedidos ──
    if not os.path.exists(ARQUIVO_PEDIDOS):
        print(f"\n  ❌ Arquivo não encontrado:")
        print(f"     {ARQUIVO_PEDIDOS}")
        print(f"\n  💡 Certifique-se de que dados_pedidos.json está na pasta app/js/")
        sys.exit(1)

    try:
        with open(ARQUIVO_PEDIDOS, "r", encoding="utf-8") as f:
            pedidos = json.load(f)
    except json.JSONDecodeError as e:
        print(f"\n  ❌ Erro ao ler JSON de pedidos: {e}")
        sys.exit(1)

    if not isinstance(pedidos, list):
        print(f"\n  ❌ dados_pedidos.json deve ser uma lista (array). Recebido: {type(pedidos).__name__}")
        sys.exit(1)

    total = len(pedidos)
    print(f"\n  ✅ Pedidos carregados: {total} registros")

    # ── 2. Detectar campos de data disponíveis ──
    amostra = pedidos[0] if pedidos else {}
    campo_data_usado = "N/A (fallback para data atual)"
    for campo in CAMPOS_DATA:
        if campo in amostra and amostra[campo]:
            campo_data_usado = campo
            break

    print(f"  📅 Campo de data detectado: '{campo_data_usado}'")
    print(f"  📅 Data fallback (se ausente): {DATA_FALLBACK}")

    # ── 3. Gerar IDs únicos ──
    ids_unicos = gerar_ids_unicos(total)
    print(f"  🆔 IDs aleatórios gerados: {len(ids_unicos)} únicos (11 chars)")

    # ── 4. Montar registros de chat ──
    print(f"\n  ⚙️  Montando {total} registros de chat...")

    chat_registros = []
    for i, pedido in enumerate(pedidos):
        registro = {
            "id":         ids_unicos[i],
            "id_cliente": pedido.get("id_cliente", ""),
            "pedido_id":  pedido.get("id", ""),
            "texto":      formatar_texto_chat(pedido),
            "hora":       pedido.get("horario", ""),
            "data":       extrair_data(pedido),
            "finalizado": "CONCLUIDO"
        }
        chat_registros.append(registro)

    print(f"  ✅ {len(chat_registros)} registros montados com sucesso!")

    # ── 5. Validar ──
    print(f"\n  🔍 Validando registros...")
    erros = validar_registros(chat_registros)

    if erros:
        print(f"\n  ⚠️  {len(erros)} problema(s) encontrado(s):")
        for e in erros[:10]:
            print(f"     {e}")
        if len(erros) > 10:
            print(f"     ... e mais {len(erros) - 10} problema(s)")
    else:
        print(f"  ✅ Todos os {len(chat_registros)} registros válidos!")

    # ── 6. Salvar JSON ──
    try:
        with open(ARQUIVO_CHAT, "w", encoding="utf-8") as f:
            json.dump(chat_registros, f, ensure_ascii=False, indent=2)
        print(f"\n  💾 Arquivo salvo: {ARQUIVO_CHAT}")
        tamanho_kb = os.path.getsize(ARQUIVO_CHAT) / 1024
        print(f"  📊 Tamanho: {tamanho_kb:.1f} KB")
    except IOError as e:
        print(f"\n  ❌ Erro ao salvar: {e}")
        sys.exit(1)

    # ── 7. Preview ──
    print(f"\n{'─'*60}")
    print("  📋 PREVIEW — Primeiros 3 registros:")
    print(f"{'─'*60}")

    for reg in chat_registros[:3]:
        print(f"\n  🆔 id:         {reg['id']}")
        print(f"  👤 id_cliente: {reg['id_cliente']}")
        print(f"  📦 pedido_id:  {reg['pedido_id']}")
        print(f"  ⏰ hora:       {reg['hora']}")
        print(f"  📅 data:       {reg['data']}")
        print(f"  ✅ finalizado: {reg['finalizado']}")
        print(f"  📝 texto:      {reg['texto'][:90]}...")

    print(f"\n{'─'*60}")
    print("  📋 PREVIEW — Últimos 3 registros:")
    print(f"{'─'*60}")

    for reg in chat_registros[-3:]:
        print(f"\n  🆔 id:         {reg['id']}")
        print(f"  👤 id_cliente: {reg['id_cliente']}")
        print(f"  📦 pedido_id:  {reg['pedido_id']}")
        print(f"  ⏰ hora:       {reg['hora']}")
        print(f"  📅 data:       {reg['data']}")
        print(f"  ✅ finalizado: {reg['finalizado']}")
        print(f"  📝 texto:      {reg['texto'][:90]}...")

    # ── 8. Estatísticas ──
    datas_unicas = set(r["data"] for r in chat_registros)
    clientes_unicos = set(r["id_cliente"] for r in chat_registros if r["id_cliente"])

    print(f"\n{'='*60}")
    print(f"  📊 RESUMO FINAL")
    print(f"{'='*60}")
    print(f"  📦 Total de registros: {len(chat_registros)}")
    print(f"  👤 Clientes únicos:    {len(clientes_unicos)}")
    print(f"  📅 Datas distintas:    {len(datas_unicas)}")
    print(f"  ✅ Status de todos:    CONCLUIDO")
    print(f"  🆔 Formato ID:        11 chars alfanuméricos")

    if len(datas_unicas) <= 10:
        print(f"\n  📅 Datas encontradas:")
        for d in sorted(datas_unicas):
            qtd = sum(1 for r in chat_registros if r["data"] == d)
            print(f"     {d} → {qtd} pedidos")

    print(f"\n{'='*60}")
    print(f"  🚀 PRÓXIMO PASSO:")
    print(f"     1. Limpe os 13 registros antigos da aba CHAT")
    print(f"     2. Rode: python3 popular_banco.py")
    print(f"     3. Escolha opção [3] (Somente CHAT)")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
