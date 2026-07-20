DADOS_BRUTOS = """
08:08	14/07/2026	Isamara	AUANDER	COLETA	MAURICIO — R.Amélia Pyramo,94,Santa Helena→Av.Brasil,283	R$42,00	CPAP; às 8h
08:09	14/07/2026	Jair Generoso	AUANDER	COLETA	MAURICIO — R.Luís Cosme,455,Havaí→Av.Brasil,283	R$22,00	CPAP; de manhã
08:11	14/07/2026	Sr.Fagner	AUANDER	COLETA	MAURICIO — R.São Tiago,7,São Tomás	R$26,00	CPAP; ~8h30
08:15	14/07/2026	Maria Tereza/Tâmara	AUANDER	COLETA/ENTREGA	TAMARA — R.Brumadinho,407/101,Prado→R.Itamirim,25,Vera Cruz	R$27,00	Até 9h
08:19	14/07/2026	Vera Lucia	AUANDER	COLETA	TAMARA CAPS — R.Gonçalves Dias,2429/1202,Lourdes	R$22,00	Na portaria
08:41	14/07/2026	João Batista	GRUPO	COLETA	MAURICIO — R.Wania Carvalho Silveira,51/401,Silveira	R$32,00	CPAP
08:50	14/07/2026	Silvania	AUANDER	COLETA	MAURICIO — R.Cons.Andrade Figueira,22/102,Gutierrez	R$16,00	-
08:53	14/07/2026	Ana Tereza	AUANDER	COLETA	MAURICIO — Hosp.Felício Rocho,CTI Pediátrico	R$22,00	Fisioterapeuta
09:10	14/07/2026	Kassinha	GRUPO	COLETA	VAL — R.Bernardino de Lima,321,Gutierrez	R$18,00	LN
09:33	14/07/2026	Cássia	AUANDER	COLETA	PLURAL — R.João Antônio de Azevedo,320/1102,Belvedere	R$17,00	-
10:04	14/07/2026	Amauri Bispo	GRUPO	COLETA/ENTREGA	AMMIS — R.Helia Ricaldone de Freitas,357,Serrano	R$40,00	-
10:23	14/07/2026	Áster Gráfica	GRUPO	COLETA	ELISA ATHENIENSE CEARA — R.José de Alencar,700→R.Ceará,1332	R$20,00	Até 12h
10:36	14/07/2026	Elaine Kumaira	AUANDER	ENTREGA	INCLOSET — R.João Furtado,200/2201,Gutierrez	R$18,00	Até 12h
10:39	14/07/2026	—	GRUPO	COLETA/ENTREGA	DELUZA — R.Viçosa,768→R.Jorge Fontana,50/601,Belvedere	R$22,00	-
10:47	14/07/2026	Juliana	GRUPO	ENTREGA	ELISA ATHENIENSE CEARA — Av.Francisco Sales,1420/1304	R$17,00	-
11:30	14/07/2026	Erika Diniz	AUANDER	ENTREGA	AMMIS — R.Califórnia,546/1000,Sion	R$20,00	-
12:00	14/07/2026	Camila/Angela-Tiago	AUANDER	COLETA/ENTREGA	ELISA ATHENIENSE — R.Ceará,1332→Botânico,loja237	R$15,00	-
12:13	14/07/2026	Camila/Angela-Tiago	GRUPO	COLETA/ENTREGA	ELISA ATHENIENSE CEARA — Botânico,loja237→R.Ceará,1332	R$15,00	Realocado de AUANDER p/ manter contagem 19
12:21	14/07/2026	L.D.C	IGOR	ENTREGA	OPMINAS — MATER DEI CONTORNO	R$22,00	01 Sacola
12:38	14/07/2026	Debora	AUANDER	COLETA	TAMARA CAPS — R.Domingos Vieira,273/1001,Sta.Efigênia	R$20,00	-
13:31	14/07/2026	Eduardo	AUANDER	ENTREGA	MAURICIO — R.Lauro Ferreira,192/701,Buritis	R$22,00	CPAP
13:32	14/07/2026	Maristela	AUANDER	ENTREGA	MAURICIO — R.Amanda,137,Betânia	R$29,00	CPAP
13:32	14/07/2026	João Batista	IGOR	ENTREGA	MAURICIO — R.Wania Carvalho Silveira,51/401	R$32,00	CPAP; urgente
13:34	14/07/2026	Evandro/Célia Bonate	IGOR	ENTREGA	MAURICIO — R.São José do Divino,100,Sta.Branca	R$30,00	CPAP
13:53	14/07/2026	Áurea	GRUPO	ENTREGA	AMMIS — Av.Raja Gabáglia,2708/315,Estoril	R$17,00	-
14:02	14/07/2026	—	AUANDER	ENTREGA	TELECOM — Shop.Contagem→Minas Shopping	R$80,00	2 pontos
14:12	14/07/2026	Karina Pissolato	GRUPO	ENTREGA	M PITANGA — R.Dom Aristides Porto,245/401	R$23,00	Até 16h
14:17	14/07/2026	Edivaldo	IGOR	COM RETORNO	MAURICIO — R.Augusto de Lima,1674,BlB/508	R$27,00	Até 17h
14:41	14/07/2026	Debora Maia	IGOR	ENTREGA	S MANOEL — R.Ouro Preto,581/1106	R$17,00	-
14:47	14/07/2026	Nathalia Sudano	GRUPO	ENTREGA	HOPPE — Av.Contorno,8256,2ºandar	R$17,00	-
14:49	14/07/2026	L.S.C	IGOR	COLETA	OPMINAS — MATER DEI NOVA LIMA	R$25,00	-
14:50	14/07/2026	Camila/Angela-Tiago	GRUPO	COLETA/ENTREGA	ELISA ATHENIENSE CEARA — Botânico→R.Ceará,1332	R$15,00	-
14:53	14/07/2026	Luciene Felix	AUANDER	ENTREGA	COLETA — Av.Padre Pedro Pinto,322,Venda Nova	R$45,00	15h30
14:53	14/07/2026	S.C.H	IGOR	COLETA	OPMINAS — MATER DEI SANTO AGOSTINHO	R$22,00	-
14:58	14/07/2026	Sr.Fagner	IGOR	ENTREGA	MAURICIO — R.São Tiago,7,São Tomás	R$26,00	Até 17h
15:03	14/07/2026	Gustavo	AUANDER	ENTREGA	MAURICIO — R.Manila,90/208,Havaí	R$22,00	CPAP
15:31	14/07/2026	Isamara	AUANDER	ENTREGA	MAURICIO — R.Amélia Pyramo,94,Sta.Helena	R$42,00	CPAP
16:12	14/07/2026	Patrícia	GRUPO	ENTREGA	FF FASHION — R.Otaviano Fabri,220,Ermelinda	R$26,00	Até 17h30
16:42	14/07/2026	Françoise	AUANDER	ENTREGA	MAURICIO — R.Otaviano Carneiro,266,Boa Vista	R$16,00	CPAP
17:09	14/07/2026	Ana	GRUPO	ENTREGA	FF FASHION — R.Estevão Pinto,673/1700	R$16,00	-
17:25	14/07/2026	Philipe G.Santos	GRUPO	ENTREGA	CESTA — R.Adem,59,Alípio de Melo	R$24,00	-
17:50	14/07/2026	Nathalia	GRUPO	ENTREGA	ELISA ATHENIENSE CEARA — R.Ouro Preto,1396/701	R$18,00	-
19:31	14/07/2026	Ana	GRUPO	ENTREGA	KOPENHAGEN — Prof.Otávio Coelho de Magalhães,11	R$16,00	-
07:52	15/07/2026	Sr.Rogério	EMERSON	COLETA	MAURICIO — R.Wilson Modesto Ribeiro,215/702	R$17,00	-
08:44	15/07/2026	Natália	AUANDER	ENTREGA	PLURAL — R.Antônio de Albuquerque,749/502	R$18,00	10h
09:44	15/07/2026	Juliana	AUANDER	ENTREGA	JOSI FRAGA — R.Araraquara,401/601	R$18,00	Até 11h
09:46	15/07/2026	Claudio Casteluber	AUANDER	ENTREGA	CESTA — Av.Contorno,4456,7ºandar	R$17,00	-
10:04	15/07/2026	Andrea	EMERSON	ENTREGA	VANDA — R.Serranos,115/301,Serra	R$24,00	-
10:12	15/07/2026	Costureira Raquel	AUANDER	ENTREGA	VAL — R.Pedro Natalício,275/403,Buritis	R$20,00	-
10:56	15/07/2026	Maria Rita/Paola Fashion	EMERSON	COLETA	FF FASHION — R.Alagoas,772,9ºandar	R$16,00	-
10:57	15/07/2026	Jaqueline Passos	AUANDER	ENTREGA PRIORIDADE	PLURAL — R.Paracatu,1300/1502	R$15,00	-
11:06	15/07/2026	Renata Rezende	EMERSON	ENTREGA	KOPENHAGEN — R.Americo Scott,63/601,Serra	R$17,00	Portaria; realocado de AUANDER
11:10	15/07/2026	Cristina Campos	AUANDER	ENTREGA	AMMIS — R.Marco Paulo Simon Jardim,857/1502,Nova Lima	R$22,00	Green Garden; realocado de EMERSON
11:11	15/07/2026	Valéria/Nicole	AUANDER	ENTREGA	AMMIS — Av.Constelações,725/104-2	R$25,00	Realocado de EMERSON
11:19	15/07/2026	C.A.S.S/S.C.H	EMERSON	COLETA	OPMINAS — Mater Dei Sto.Agostinho	R$22,00	-
11:20	15/07/2026	Camila Stephanie/Rafael Henrique	EMERSON	COLETA	OPMINAS — Instituto	R$27,00	02 Malas P+2 Sacolas; realocado de AUANDER
11:27	15/07/2026	Juliana Cordeiro	EMERSON	ENTREGA	AMMIS — Av.Afonso Pena,4121,12ºandar	R$20,00	-
11:40	15/07/2026	Erika Diniz	EMERSON	COLETA	AMMIS — R.Califórnia,546/1000,Sion	R$20,00	Portaria; realocado de AUANDER
11:49	15/07/2026	Luciana/Luiza	AUANDER	COLETA/ENTREGA	MARI DANT — R.Pampas,568→R.Esmeraldo Botelho,166/202	R$22,00	-
12:01	15/07/2026	Wallace	AUANDER	ENTREGA	ROSA DALIA — R.Juvenal Melo Senra,317	R$22,00	-
12:26	15/07/2026	Heloísa	AUANDER	COLETA	AMMIS — Al.do Morro,190/1300,Belvedere	R$15,00	Realocado de EMERSON
12:43	15/07/2026	Ana Paula Neves	IGOR	ENTREGA	PLURAL — R.Monserate,188,Vila Castela	R$30,00	-
12:44	15/07/2026	J.D.L	IGOR	ENTREGA	OPMINAS — Mater Dei Contorno	R$22,00	-
12:44	15/07/2026	Robson Rogerio	IGOR	ENTREGA	OPMINAS — Felício Rocho	R$22,00	-
12:45	15/07/2026	Irene Braga	IGOR	ENTREGA	OPMINAS — Vera Cruz	R$22,00	Confirmado: permanece IGOR
13:10	15/07/2026	Débora	IGOR	ENTREGA	ELISA ATHENIENSE BOTÂNICO — Cond.Passargada	R$55,00	-
13:27	15/07/2026	Dr.Eliana	AUANDER	ENTREGA	VAL — Alvarenga Peixoto,1408/804	R$18,00	-
14:35	15/07/2026	Camila/Angela-Tiago	EMERSON	COLETA/ENTREGA	ELISA ATHENIENSE — R.Ceará→Botânico	R$15,00	Realocado de IGOR
14:42	15/07/2026	Linvatec008	IGOR	ENTREGA	OPMINAS — Surgical	R$22,00	-
15:40	15/07/2026	—	AUANDER	ENTREGA	ELISA ATHENIENSE CEARA — R.Paraíba,966/1103	R$17,00	-
15:45	15/07/2026	Luiza B Vilas	AUANDER	ENTREGA	CESTA — Av.Raja Gabáglia,4859/105	R$17,00	-
15:46	15/07/2026	Rubia Mara	AUANDER	ENTREGA	CESTA — R.Francisco Bicalho,2375/201	R$20,00	-
17:07	15/07/2026	Fernanda	AUANDER	ENTREGA	FF FASHION — Pç.Dep.Renato Azeredo,250/601	R$17,00	-
17:30	15/07/2026	Carol Baião	AUANDER	ENTREGA	INCLOSET — R.Montes Claros,429/202,Carmo	R$17,00	Confirmado: permanece AUANDER
17:30	15/07/2026	—	EMERSON	ENTREGA	NATUPET	R$80,00	5 entregas
17:39	15/07/2026	Lucas	AUANDER	ENTREGA	KOPENHAGEN — R.Montes Claros,1099	R$16,00	-
09:08	16/07/2026	Michelle Sabarense	AUANDER	ENTREGA	Rua Costa Rica 147 apto 401, Sion	R$19,00	Entregar amanhã de 9h às 11h
09:09	16/07/2026	Silvia Barbosa Ribeiro	AUANDER	ENTREGA	Rua Professor Sylvio Andrade 415, Serrano	R$35,00	Entregar de 12h às 15h
09:54	16/07/2026	Implantec (pegar com Hudson)	IGOR	COLETA	Malas novas - 02 malas P	R$37,00	Entre 10:30 e 11:00h
10:03	16/07/2026	Vanessa	AUANDER	ENTREGA	Rua Ouro Preto 1523, Apto 1102, Santo Agostinho	R$18,00	-
10:05	16/07/2026	Abel Odorico / Tâmara	GRUPO	COLETA	Coleta: Av. Barbacena 1219 (prédio Banco Inter) / Entrega: Rua Itamirim 25, Vera Cruz	R$20,00	Coletar até 11:30 - Ligar quando chegar (3199898-2288)
10:12	16/07/2026	Luciana Dias Macedo	AUANDER	ENTREGA	Rua Doutor Ismael de Faria 169, Luxemburgo	R$18,00	Deixar com porteiro - Entregar até 12h
10:17	16/07/2026	Ana Cristina Henriques	AUANDER	ENTREGA	Rua Castelo Lamego, 555, apt 302, Castelo	R$35,00	Entregar até 15h
10:18	16/07/2026	Carol Baião	AUANDER	COM RETORNO	Rua Montes Claros, 429 apto 202, Carmo	R$27,00	-
10:22	16/07/2026	—	GRUPO	COM RETORNO	Retirada: Botânico Shopping (Angela/Tiago) / Entrega: R. Ceará, 1332, loja 02 - Funcionários (Camila)	R$15,00	-
11:18	16/07/2026	Tathya	AUANDER	ENTREGA	Rua Matias Cardoso 304, Apto 1502, Santo Agostinho	R$18,00	-
11:21	16/07/2026	Paola Sede 2	AUANDER	ENTREGA	R Senador Lima Guimarães N 108/4 andar	R$18,00	Até 13h30
11:25	16/07/2026	Aida	AUANDER	TROCA	Rua Cordelina Silveira Matos, 53, apto 302, Estoril	R$27,00	-
11:25	16/07/2026	Costureira Raquel	AUANDER	COLETA	Rua Pedro Natalício 275, apt 403, Buritis	R$20,00	Mudou de endereço
11:39	16/07/2026	Mater Dei Contorno	IGOR	COLETA	Mala G+ 04 sacolas (PAC: H.M.A/A.S.S/L.D.C.F/J.D.L)	R$22,00	Pedido OPI0025
12:17	16/07/2026	Mater Dei Contorno	IGOR	ENTREGA	Mala P+ 01 sacola (PAC: E.D.S.)	R$22,00	-
13:05	16/07/2026	—	IGOR	COM RETORNO	Coleta: Av. Mário Werneck 2134, Buritis / Entrega: Av. do Contorno 5823, sala 901, Savassi	R$24,00	-
13:24	16/07/2026	Érika Corrêa	IGOR	ENTREGA	Rua Vereda, 50, apto 1002, torre 3, Vila da Serra, Cond. Metrópole	R$18,00	Roupa - Até 16h
13:34	16/07/2026	Serr Baterias	IGOR	ENTREGA	R Dona Salvadora N 38, Serra	R$17,00	-
13:35	16/07/2026	Helena	IGOR	ENTREGA	R Teixeira de Freitas, 155, apto 401, B. Santo Antônio	R$17,00	-
13:35	16/07/2026	—	IGOR	COM RETORNO	Retirada: R. Ceará, 1332, loja 02 - Funcionários (Camila) / Entrega: Botânico Shopping (Angela/Tiago)	R$15,00	-
13:47	16/07/2026	Juliana Nogueira	IGOR	ENTREGA	Rua Piauí 1052, apt 802, Funcionários	R$17,00	-
14:09	16/07/2026	Eliamar Caetano	IGOR	ENTREGA	Rua Progresso 618, loja B, Padre Eustáquio (consultório odontológico)	R$23,00	Entregar até 16h
14:10	16/07/2026	—	IGOR	COM RETORNO	Retirada: Botânico Shopping (Angela/Tiago) / Entrega: R. Ceará, 1332, loja 02 - Funcionários (Camila)	R$15,00	-
14:14	16/07/2026	Ana Beatriz	IGOR	ENTREGA	Rua Rio de Janeiro 2300, Apt 1400, Lourdes	R$17,00	-
15:03	16/07/2026	Helena	IGOR	COM RETORNO	R Teixeira de Freitas, 155, apto 401, B. Santo Antônio	R$28,00	-
15:10	16/07/2026	Andreia	IGOR	ENTREGA	Oficina do Salto - R Congonhas N 724, Santo Antônio	R$16,00	-
15:18	16/07/2026	Cris Antunes	AUANDER	ENTREGA	Rua Ministro Orozimbo Nonato 395/2305, Vila da Serra	R$21,00	1 malinha já disponível
15:27	16/07/2026	Erika Tristão	AUANDER	ENTREGA	Rua Paraíba, 1287, apto 901, Savassi	R$21,00	-
15:43	16/07/2026	Costureira Cida	AUANDER	COLETA	Av. Vitório Marcolo N 203, Anchieta	R$18,00	Até 18h
16:08	16/07/2026	Costureira Isabel	AUANDER	COLETA	R Miguel Gomes da Costa N 52, Mantiqueira	R$42,00	-
16:36	16/07/2026	FF FASHION	IGOR	ENTREGA	Rua Luz, 192/401 - Serra (A/C Thais)	R$16,00	Coletar na FF
16:43	16/07/2026	FF FASHION	AUANDER	ENTREGA	Av. Dr. Marco Paulo Simon Jardim, 620, ap 1101 - Piemonte, Nova Lima (A/C Maira Lima)	R$22,00	Coletar na FF; perto da Fundação Torino, região Vila da Serra
16:54	16/07/2026	ELISA ATHENI	AUANDER	RETIRADA/ENTREGA	Rua Ceará, 1332, loja 02 - Funcionários (procurar Camila)	R$15,00	Retirada: Botânico Shopping, Av. Celso Porfírio Machado, 150, loja 237 - Belvedere (procurar Angela/Tiago)
17:57	16/07/2026	ELISA ATHENI	IGOR	ENTREGA	Rua Cardeal Stepinac, 170/801 - Cidade Nova (Simone Neves)	R$18,00	Entrega 1
17:57	16/07/2026	ELISA ATHENI	IGOR	ENTREGA	Av. Olegário Maciel, 2174/2001 - Santo Agostinho (Paula Vilela Ramos)	R$17,00	Entrega 2
19:12	16/07/2026	FFASHION	GRUPO	ENTREGA	Rua da Mata, 205, apto 1102, torre 1 - Vila da Serra (Cyntia Nayara)	R$24,00	-
08:00	17/07/2026	Carolina Castro (de Arthur Miranda - 31 99533-2708)	GRUPO	CESTA	Rua Pitangui, 2718, apto 602 - Sagrada Família	R$ 18,00	
09:00	17/07/2026	Valéria Castro (de Bárbara Pellegrini - +1 682 774 7735 / cel 31 99956-9758)	GRUPO	CESTA	Rua Carangola, 703/1101 - Santo Antônio	R$ 18,00	Retirada às 9:00
08:03	17/07/2026	Kenia	AUANDER	BASIQUE	Rua Junquilhos, 600, ap 104 - Nova Suíça	R$ 20,00	Entrega às 10h - entregar até 11:30
08:04	17/07/2026	Ludmila Salomão Venâncio	CANCELADO	BASIQUE	Av. Marechal Castelo Branco, 445, Apto 804 A - JK, Contagem, CEP 32310-010	R$ 40,00	Entregar após 14h30
08:06	17/07/2026	Tania	AUANDER	BASIQUE	Rua Antônio Paulino de Castro, 104 ao 604 - Liberdade	R$ 55,00	Entregar às 14:00
08:07	17/07/2026	P&P (Postagem Correios)	IGOR	P&P	R. Santa Maria, 714 - Pedra Azul, Contagem	R$ 25,00	Pagar no P&P (Av. Wilson Tavares Ribeiro, 800 - Sta. Terezinha, Contagem) e deixar nos Correios
08:11	17/07/2026	NATUPET	IGOR	NATUPET		R$ 100,00	3 entregas - tempo de espera 40 minutos
08:30	17/07/2026	Costureira Lili	AUANDER	BASIQUE	R. Maria Gertrudes Santos, 952 - Céu Azul, BH	R$ 48,00	Coleta
08:31	17/07/2026	Barbosa	AUANDER	BASIQUE	R. Mato Grosso, 676 - Prado	R$ 20,00	Coleta na Ana
09:19	17/07/2026	Silvia Barbosa Ribeiro (Maria Pitanga)	AUANDER	M PITANGA	Rua Professor Sylvio Andrade, 415 - Serrano	R$ 56,00	Troca - fazer das 11h às 15h
09:55	17/07/2026	Irene Braga (Vera Cruz)	IGOR	OPMINAS		R$ 22,00	Coleta mala G + 01 sacola (PAC)
10:55	17/07/2026	Helena (de Rachel Santeiro)	IGOR	ELISA ATHENIENSE CEARA	R. Teixeira de Freitas, 155, apto 401 - Santo Antônio	R$ 28,00	Com retorno
11:05	17/07/2026	Camila / Angela / Tiago	IGOR	ELISA ATHENIENSE	Botânico Shopping, Av. Celso Porfírio Machado, 150, Loja 237 - Belvedere	R$ 15,00	Retirar na Rua Ceará, 1332, loja 02 (procurar Camila) - entregar (procurar Angela/Tiago)
11:20	17/07/2026	Lurdinha	IGOR	BASIQUE	Rua Estácio de Sá, 750/501 - Gutierrez	R$ 18,00	Entregar às 13h
11:20	17/07/2026	Isabela	AUANDER	BASIQUE	Rua Joaquim Figueiredo, 511 - Barreiro	R$ 35,00	Entregar às 13h
11:21	17/07/2026	Viviane Etiquetas	IGOR		Av. Augusto de Lima, 1263, Loja 6B	R$ 20,00	Coleta
11:21	17/07/2026	Ana Facção	IGOR	BASIQUE	R. Turquesa, 687/01 - Prado	R$ 20,00	Entregar às 13h
11:22	17/07/2026	Flavia Ottoni (Maria Pitanga)	IGOR	M PITANGA	Rua Costa Machado, 367, apto 202 - Universitário	R$ 33,00	Receber R$300,00 dinheiro / entregar 15h às 17:30h
12:00	17/07/2026	Michelle Neves (Maria Pitanga)	IGOR	M PITANGA	Rua Major Lopes, 738, apto 1202 - São Pedro	R$ 18,00	Entregar até 15h
12:25	17/07/2026	Tathya	IGOR	AMMIS	Trazer para Ammis (de Rua Matias Cardoso, 304, Apto 1502 - Santo Agostinho)	R$ 18,00	Coleta
12:26	17/07/2026	Amanda	IGOR	AMMIS	Rua Gonzales Pecotche, 392, ap 1503, t3 - Vila da Serra	R$ 18,00	Pegar malinha na Ammis
12:50	17/07/2026	Viviane Etiquetas	IGOR	BASIQUE	Av. Augusto de Lima, 1263, Loja 6B	R$ 22,00	Coleta
13:22	17/07/2026	J.M.A.T (Mater Dei Contorno)	IGOR	OPMINAS		R$ 22,00	Entrega 01 sacola (PAC)
13:51	17/07/2026	Melissa Gualberto	IGOR	M PITANGA	Rua Campanha, 182/1202 - Sion	R$ 19,00	Entregar até 17h
14:12	17/07/2026	Daniel e família (de Rachel Santeiro - 99817-1197)	GRUPO	CESTA	Av. Protásio de Oliveira Pena, 253/602 - Buritis	R$ 22,00	Retirada 15:30 às 16:00
14:24	17/07/2026	Glaucia	GRUPO	AMMIS	Rua Antônio de Albuquerque, 230, Apto 1101 - Savassi	R$ 21,00	Buscar malinha na Ammis
14:26	17/07/2026	Talita	IGOR	ELISA ATHENIENSE	Rua Ceará (trazer da Av. Francisco Deslandes, 971, sala 712)	R$ 20,00	Coleta - baú do motoboy precisa ser grande
14:38	17/07/2026	Liamara Sousa Santos (Maria Pitanga)	AUANDER	M PITANGA	Rua João Antônio Azeredo, 320, apto 102 - Belvedere	R$ 16,00	Entregar até 17h
14:50	17/07/2026	Casa da Val	GRUPO	CASA DA VAL	Rua Maria de Lourdes Camelo, 150 - Caiçaras	R$ 30,00	Coleta
15:20	17/07/2026	Antonio Carlos (Casa da Joelma)	GRUPO	OPMINAS	Rua Naná, 165 - Milionários, portão amarelo (GPS nº 769)	R$ 38,00	Entrega mala P + 01 sacola (PAC)
15:21	17/07/2026	Rachel Tergilene	IGOR	AMMIS	Rua Embaúba, 215 - Condomínio Ouro Velho	R$ 29,00	
15:56	17/07/2026	Karol	AUANDER	FF FASHION	Rua da Luz Serena, 330 - Vale dos Cristais, Nova Lima	R$ 38,00	Com retorno - coletar na FF - aguardar cliente experimentar
16:10	17/07/2026	Arthur e Eloah (Loja Azul Cargo Express)	IGOR	OPMINAS	Av. Álvares Cabral, 980 - Lourdes, BH, CEP 30170-002	R$ 22,00	Entrega mala G - PAC Curitiba (23/07)
16:13	17/07/2026	Marisa Castana	AUANDER	INCLOSET	Rua Juiz de Fora, 1268, conjunto 604 - Santo Agostinho	R$ 18,00	Entregar até 18h
16:28	17/07/2026	Ana Lívia Canela	AUANDER	INCLOSET	Radisson Blue - Rua Lavras, 150 (Hotel)	R$ 17,00	
16:45	17/07/2026	Daniele Franklin	AUANDER	FF FASHION	Rua Levy Lafetá, 161, apto 1901 - Belvedere	R$ 22,00	Deixar na portaria
17:21	17/07/2026	Lurdinha	AUANDER	BASIQUE	Rua Estácio de Sá, 750/501 - Gutierrez	R$ 28,00	Com retorno
17:44	17/07/2026	Marcela	AUANDER	BASIQUE	Rua Padre João Crisóstomo, 400, apto 601	R$ 22,00	
17:44	17/07/2026	Tayra	AUANDER	AMMIS	Rua da Fonte, 110, apto 2602 - Vila da Serra	R$ 18,00	
17:49	17/07/2026	Alessandra	AUANDER	FF FASHION	Av. Afonso XIII, 821/202 - Gutierrez	R$ 18,00	Entregar até 16:30h - coletar na FF
17:57	16/07/2026	ELISA ATHENI	IGOR	Entrega	Simone Neves - Cidade Nova	R$ 18,00	Rua Cardeal Stepinac, 170/801 - Cidade Nova
17:57	16/07/2026	ELISA ATHENI	IGOR	Entrega	Paula Vilela Ramos - Santo Agostinho	R$ 17,00	Av Olegário Maciel, 2174/2001 - Santo Agostinho
07:50	18/07/2026	CESTA	GRUPO	ENTREGA	Gilmara (31 97155-1021) - Rua Desembargador Paula Mota, 1565, ap 403, bloco A, bairro Ouro Preto - BH	R$ 23,00	Turno 8:30
10:45	18/07/2026	FF FASHION	GRUPO	ENTREGA	Deise Erka - Rua Caetano de Azeredo, 600, ap 301, Barreiro de Baixo	R$ 40,00	
11:17	18/07/2026	CESTA	GRUPO	ENTREGA	Marlene (31) 98667-6872 - Avenida Ribeiro de Paiva, 211, casa 4, Bairro João Pinheiro	R$ 45,00	Retirada 10:30 às 11:00 / Tempo de espera
12:01	18/07/2026	BASIQUE	GRUPO	ENTREGA	Paula Birchal - Av. Barbacena, 1399, ap 1003, Santo Agostinho	R$ 18,00	
12:35	18/07/2026	BASIQUE	GRUPO	ENTREGA e COLETA	Cris Antunes - Rua Ministro Orozimbo Nonato, 395, ap 2305, Vila da Serra	R$ 28,00	1 malinha já disponível
12:46	18/07/2026	BASIQUE	GRUPO	ENTREGA	Vanessa - Rua Riachuelo, 1697, ap 201, Padre Eustáquio	R$ 23,00	
12:58	18/07/2026	FF FASHION	GRUPO	COLETA	Cyntia Nayara - Rua da Mata, 205, ap 1102, torre 1, Vila da Serra	R$ 22,00	
14:03	18/07/2026	FF FASHION	GRUPO	ENTREGA	Georgia Hannas - Rua Felipe dos Santos, 358, ap 501	R$ 18,00	
""".strip()