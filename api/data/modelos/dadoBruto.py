DADOS_BRUTOS = """
10/07/2026 15:33:00	rdoexpress2017@gmail.com	10/07/2026	MIMA ME	IGOR	ENTREGA	R. Paraíba, 1287, apto 901, Savassi	R$ 20,00	IGOR	Erika Tristão
10/07/2026 15:46:00	rdoexpress2017@gmail.com	10/07/2026	MAURICIO	GRUPO	ENTREGA	Entrega: Rua Dimas Ribeiro, 480 (depósito de gás) / Coleta: Av. Brasil, 283, sala 903/904	R$ 40,00	GRUPO	CPAP Minas - Arlindo (31) 98712-7676 - antes 17:30 - Cartão: $300 à vista ou $350 em 5x
10/07/2026 15:52:00	rdoexpress2017@gmail.com	10/07/2026	ELISA ATHENIENSE CEARA	GRUPO	RETIRADA/ENTREGA	Retirada: Botânico Shopping - Av. Celso Porfírio Machado, 150, loja 237, Belvedere (Angela/Tiago) / Entrega: Rua Ceará, 1332, loja 02, Funcionários (Camila)	R$ 15,00	GRUPO	-
10/07/2026 16:04:00	rdoexpress2017@gmail.com	10/07/2026	AMMIS	EMERSON	ENTREGA	Rua Juiz de Fora, 1268, sala 608, Santo Agostinho	R$ 18,00	EMERSON	Marisa - até 17h
10/07/2026 16:13:00	rdoexpress2017@gmail.com	10/07/2026	AMMIS	EMERSON	ENTREGA	Alameda Oscar Niemeyer, 1374, ap 901, Torre 1, Vila da Serra	R$ 18,00	EMERSON	Cliente Heloísa
10/07/2026 16:16:00	rdoexpress2017@gmail.com	10/07/2026	ELISA ATHENIENSE	AUANDER	RETIRADA/ENTREGA	Retirada: Rua Ceará, 1332, loja 02, Funcionários (Camila) / Entrega: Botânico Shopping - Av. Celso Porfírio Machado, 150, loja 237, Belvedere (Angela/Tiago)	R$ 15,00	AUANDER	-
10/07/2026 16:58:00	rdoexpress2017@gmail.com	10/07/2026	MAURICIO	AUANDER	ENTREGA	Entrega: Rua do Mosteiro, 135, Vila Paris / Coleta: Av. Brasil, 283, sala 903/904	R$ 17,00	AUANDER	CPAP Minas - Irmã Rosária (31) 9731-2681
10/07/2026 19:07:00	rdoexpress2017@gmail.com	10/07/2026	ELISA ATHENIENSE CEARA	IGOR	ENTREGA	Retirada: Botânico Shopping, Av. Celso Porfírio Machado 150 loja 237, Belvedere / Entrega: Rua Ceará 1332 loja 02, Funcionários	R$ 15,00	IGOR	Procurar Angela/Tiago (retirada) e Camila (entrega)
10/07/2026 19:10:00	rdoexpress2017@gmail.com	10/07/2026	NATUPET	EMERSON	ENTREGA	4 entregas - percurso 36km	R$ 90,00	EMERSON	-
10/07/2026 19:12:00	rdoexpress2017@gmail.com	10/07/2026	CPAP MINAS	EMERSON	COLETA	Coleta: Rua Cassiano Campolina 50, Jaraguá / Entrega: Av Brasil 283 SL 903/904	R$ 35,00	EMERSON	Augusto (31) 9526-0242, a partir das 9h
11/07/2026 08:23:00	rdoexpress2017@gmail.com	11/07/2026	CPAP MINAS	AUANDER	COM RETORNO	Coleta: Av Brasil 283 SL 903/904 / Entrega: Rua Angra dos Reis 336 casa 4, São Pedro, Esmeraldas	R$ 150,00	AUANDER	Roberto (31) 99244-5235 - troca de CPAP, entregar às 10h
11/07/2026 09:03:00	rdoexpress2017@gmail.com	11/07/2026	CESTA	GRUPO	ENTREGA	Rua Corumbá 204, Carlos Prates	R$ 17,00	GRUPO	Para Adriano - retirada sábado 11/07 às 09h
11/07/2026 10:58:00	rdoexpress2017@gmail.com	11/07/2026	M PITANGA	AUANDER	ENTREGA	Rua Ouro Preto, 1707, apto 903	R$ 19,00	AUANDER	Alessandra Brandão - roupas - até 13h
11/07/2026 11:31:00	rdoexpress2017@gmail.com	11/07/2026	M PITANGA	AUANDER	TROCA	Rua Raul Ribeiro da Silva, 39, Tirol	R$ 40,00	AUANDER	Livia Maria Dinalli - roupa - até 14h
11/07/2026 10:57:00	rdoexpress2017@gmail.com	11/07/2026	M PITANGA	AUANDER	ENTREGA	Rua Chapecó 610 apto 702, Prado	R$ 21,00	AUANDER	Ana Paula Pereira - roupas - até 14h
11/07/2026 10:58:00	rdoexpress2017@gmail.com	11/07/2026	M PITANGA	AUANDER	ENTREGA	Rua Ouro Preto 1707 apto 903	R$ 19,00	AUANDER	Alessandra Brandão - roupas - até 13h
11/07/2026 11:31:00	rdoexpress2017@gmail.com	11/07/2026	M PITANGA	AUANDER	TROCA	Rua Raul Ribeiro da Silva 39, Tirol	R$ 40,00	AUANDER	Livia Maria Dinalli - roupa - até 14h
13/07/2026 07:12:00	rdoexpress2017@gmail.com	13/07/2026	MAURICIO	GRUPO	COLETA	Rua Maranhão 884	R$ 16,00	GRUPO	Avisar que foi buscar bolsa que a Juliene deixou - às 8h
13/07/2026 07:13:00	rdoexpress2017@gmail.com	13/07/2026	MAURICIO	GRUPO	COLETA	Rua Esmeraldas 523 AP 101, Prado	R$ 16,00	GRUPO	Coleta às 8h
13/07/2026 07:15:00	rdoexpress2017@gmail.com	13/07/2026	CPAP MINAS	AUANDER	COLETA	Coleta: Rua Augusto de Lima 1674 bl B ap 508, Barro Preto / Entrega: Av Brasil 283 sl 903/904	R$ 16,00	AUANDER	Edivaldo (31) 99788-3850 - às 9h
13/07/2026 07:19:00	rdoexpress2017@gmail.com	13/07/2026	CPAP MINAS	GRUPO	ENTREGA	Coleta: Rua M 178, Água Branca / Entrega: Rua 10 de Abril 169, Amazonas, Betim	R$ 35,00	GRUPO	Elsa (31) 99650-2428 - coletar até 10h
13/07/2026 08:15:00	rdoexpress2017@gmail.com	13/07/2026	MAURICIO	AUANDER	COLETA	Rua Álvaro Camargos 1545 apto 302, São João Batista	R$ 32,00	AUANDER	Endereço da Raquel
13/07/2026 08:44:00	rdoexpress2017@gmail.com	13/07/2026	MAURICIO	AUANDER	COLETA	R. Marechal Hermes da Fonseca 273, JK, Contagem	R$ 35,00	AUANDER	Maria José
13/07/2026 10:22:00	rdoexpress2017@gmail.com	13/07/2026	FF FASHION	AUANDER	ENTREGA	Alameda dos Coqueiros 1094, São José	R$ 32,00	AUANDER	A/C: Astarute Maria Mendes
13/07/2026 10:36:00	rdoexpress2017@gmail.com	13/07/2026	OPMINAS	IGOR	COLETA	Vera Cruz	R$ 22,00	IGOR	Mala P + 2 sacolas - Pac: Anny Kalessa / Israel Norberto
13/07/2026 10:36:00	rdoexpress2017@gmail.com	13/07/2026	OPMINAS	IGOR	COLETA	Baleia	R$ 25,00	IGOR	Mala P + 1 sacola - Pac: Guilherme Serino
13/07/2026 10:37:00	rdoexpress2017@gmail.com	13/07/2026	VAL	AUANDER	COM RETORNO	R. Brumadinho 438, Prado	R$ 28,00	AUANDER	Sara Santos / Jane
13/07/2026 10:38:00	rdoexpress2017@gmail.com	13/07/2026	MAURICIO	AUANDER	COLETA	Entrega: Rua 10 de Abril 169, Amazonas, Betim	R$ 47,00	AUANDER	Elsa (31) 99650-2428
13/07/2026 10:46:00	rdoexpress2017@gmail.com	13/07/2026	OPMINAS	IGOR	COLETA	Vera Cruz	R$ 22,00	IGOR	Mala G + sacola - Pac: Grazielle Neves
13/07/2026 10:52:00	rdoexpress2017@gmail.com	13/07/2026	OPMINAS	IGOR	ENTREGA	Loja Azul Cargo Express - Av. Álvares Cabral 980, Lourdes	R$ 22,00	IGOR	Mala G - Pac: Julia e Daniel (Londrina) - pesar equipamento antes de liberar
13/07/2026 10:52:00	rdoexpress2017@gmail.com	13/07/2026	OPMINAS	IGOR	COLETA	Loja Azul Cargo Express - Av. Álvares Cabral 980, Lourdes	R$ 22,00	IGOR	Mala G - Pac: Curitiba
13/07/2026 10:54:00	rdoexpress2017@gmail.com	13/07/2026	MAURICIO	AUANDER	COLETA	Av. Cristóvão Colombo 540, Savassi	R$ 16,00	AUANDER	Loja La Dance - Maria
13/07/2026 10:58:00	rdoexpress2017@gmail.com	13/07/2026	MARCILHA	GRUPO	COLETA	Av. José Faria da Rocha 5325, Eldorado, Contagem	R$ 25,00	GRUPO	Amor e Vida
13/07/2026 11:06:00	rdoexpress2017@gmail.com	13/07/2026	AMMIS	AUANDER	ENTREGA	Alameda do Morro 190 apto 1300, Belvedere	R$ 15,00	AUANDER	Heloísa
13/07/2026 12:07:00	rdoexpress2017@gmail.com	13/07/2026	DELUZA	GRUPO	COLETA	Rua Comandante Giliardi Siqueira 64, Industrial	R$ 33,00	GRUPO	Maria do Carmo
13/07/2026 12:17:00	rdoexpress2017@gmail.com	13/07/2026	OPMINAS	GRUPO	ENTREGA	Instituto	R$ 27,00	GRUPO	2 malas P + 2 sacolas - Pac: Camila Stephanie / Rafael Henrique
13/07/2026 12:17:00	rdoexpress2017@gmail.com	13/07/2026	OPMINAS	IGOR	ENTREGA	Madre Teresa Politec ⚠️	R$ 22,00	IGOR	Caixa com chave retirada Osia - Pac: Nara de Oliveira
13/07/2026 13:39:00	rdoexpress2017@gmail.com	13/07/2026	M PITANGA	IGOR	ENTREGA	Rua Frederico Bracher Junior 200 apto 205A, Padre Eustáquio	R$ 23,00	IGOR	Patricia Rolla Fernandes - até 16h
13/07/2026 13:45:00	rdoexpress2017@gmail.com	13/07/2026	S MANOEL	AUANDER	ENTREGA	Rua Patagônia 234 apto 1201, Sion	R$ 18,00	AUANDER	Mariangela Savoi (São Manoel) - até 16h
13/07/2026 14:07:00	rdoexpress2017@gmail.com	13/07/2026	MAURICIO	AUANDER	ENTREGA	Av. Cristóvão Colombo 540, Savassi	R$ 16,00	AUANDER	Loja La Dance - Maria - até 17h
13/07/2026 14:56:00	rdoexpress2017@gmail.com	13/07/2026	OPMINAS	AUANDER	ENTREGA	Mater Dei Santo Agostinho	R$ 29,00	AUANDER	2 malas P + 2 sacolas - Pac: H.M.D / C.A.D.S.S
13/07/2026 14:57:00	rdoexpress2017@gmail.com	13/07/2026	OPMINAS	IGOR	ENTREGA	Mater Dei Contorno	R$ 22,00	IGOR	1 sacola - Pac: A.S.S
13/07/2026 14:57:00	rdoexpress2017@gmail.com	13/07/2026	OPMINAS	IGOR	ENTREGA	Felício Rocho	R$ 22,00	IGOR	1 sacola - Pac: Ana Luiza
13/07/2026 14:58:00	rdoexpress2017@gmail.com	13/07/2026	INCLOSET	AUANDER	ENTREGA	R. Senador Lima Guimarães 108, 4º andar	R$ 18,00	AUANDER	Paola Sede 2 - até 15h30
13/07/2026 15:41:00	rdoexpress2017@gmail.com	13/07/2026	AMMIS	AUANDER	ENTREGA	Rua Juiz de Fora 1268, sala 608, Santo Agostinho	R$ 17,00	AUANDER	Marisa
13/07/2026 15:50:00	rdoexpress2017@gmail.com	13/07/2026	ELISA ATHENIENSE CEARA	AUANDER	ENTREGA	Retirada: Rua Ceará 1332 loja 02, Funcionários / Entrega: Rua Estácio de Sá 900, apto 1002, Gutierrez	R$ 18,00	AUANDER	Retirada com Camila - Entrega: Josiane Lacerda Valle
13/07/2026 15:51:00	rdoexpress2017@gmail.com	13/07/2026	AMMIS	AUANDER	COM RETORNO	Retirada: Rua José Rodrigues Pereira 1278/904, Estoril	R$ 28,00	AUANDER	Fernanda Brandão - troca de sacola (recolhe uma, entrega outra)
13/07/2026 15:52:00	rdoexpress2017@gmail.com	13/07/2026	VAL	GRUPO	ENTREGA	R. Coronel Quintiliano Valadares 13, apto 201, Planalto	R$ 45,00	GRUPO	Grasiele - até 17h30
13/07/2026 15:53:00	rdoexpress2017@gmail.com	13/07/2026	ELISA ATHENIENSE	AUANDER	ENTREGA	Retirada: Rua Ceará 1332 loja 02, Funcionários / Entrega: Botânico Shopping loja 237, Belvedere	R$ 15,00	AUANDER	Retirada Camila - Entrega Angela/Tiago
13/07/2026 15:54:00	rdoexpress2017@gmail.com	13/07/2026	MAURICIO	AUANDER	ENTREGA	R. Marechal Hermes da Fonseca 273, JK, Contagem	R$ 35,00	AUANDER	Maria José
13/07/2026 15:55:00	rdoexpress2017@gmail.com	13/07/2026	MAURICIO	GRUPO	ENTREGA	Rua Maranhão 884	R$ 16,00	GRUPO	Avisar que foi buscar bolsa que a Juliene deixou
13/07/2026 15:56:00	rdoexpress2017@gmail.com	13/07/2026	CPAP MINAS	GRUPO	ENTREGA	Rua Wania Carvalho Silveira 51, AP 401, Silveira	R$ 32,00	GRUPO	João Batista (31) 99874-2309
13/07/2026 15:57:00	rdoexpress2017@gmail.com	13/07/2026	OPMINAS	IGOR	COLETA	Mater Dei Contorno - CME do Santo Agostinho	R$ 22,00	IGOR	Pac: H.M.D
13/07/2026 15:58:00	rdoexpress2017@gmail.com	13/07/2026	OPMINAS	IGOR	COLETA	Mater Dei Santo Agostinho	R$ 22,00	IGOR	1 mala P - cancelou o H.M.D
13/07/2026 15:59:00	rdoexpress2017@gmail.com	13/07/2026	ELISA ATHENIENSE CEARA	AUANDER	ENTREGA	Retirada: Botânico Shopping loja 237, Belvedere / Entrega: Rua Ceará 1332 loja 02, Funcionários	R$ 15,00	AUANDER	Retirada Angela/Tiago - Entrega Camila
13/07/2026 16:00:00	rdoexpress2017@gmail.com	13/07/2026	P&P	GRUPO	ENTREGA	Postagem: Av. Wilson Tavares Ribeiro 800, Chácaras Reunidas Sta Terezinha, Contagem / Correios: R. Santa Maria 714, Pedra Azul, Contagem	R$ 65,00	GRUPO	Pagamento no P&P - as 14h30, deixar nos correios
13/07/2026 16:01:00	rdoexpress2017@gmail.com	13/07/2026	ELISA ATHENIENSE CEARA	AUANDER	ENTREGA	Retirada: Botânico Shopping loja 237, Belvedere / Entrega: Rua Ceará 1332 loja 02, Funcionários	R$ 15,00	AUANDER	Retirada Angela/Tiago - Entrega Camila
""".strip()