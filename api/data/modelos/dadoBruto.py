DADOS_BRUTOS = """
08:08	14/07/2026	Mauricio	AUANDER	COLETA	MAURICIO — R.Amélia Pyramo,94,Santa Helena→Av.Brasil,283	R$42,00	Isamara
08:09	14/07/2026	Mauricio	AUANDER	COLETA	MAURICIO — R.Luís Cosme,455,Havaí→Av.Brasil,283	R$22,00	Jair Generoso
08:11	14/07/2026	Mauricio	GRUPO	COLETA	MAURICIO — R.São Tiago,7,São Tomás	R$26,00	Sr.Fagner
08:15	14/07/2026	Tamara	AUANDER	COLETA/ENTREGA	TAMARA — R.Brumadinho,407/101,Prado→R.Itamirim,25,Vera Cruz	R$27,00	Vera Lucia
08:19	14/07/2026	Tamara	AUANDER	COLETA	TAMARA CAPS — R.Gonçalves Dias,2429/1202,Lourdes	R$22,00	Maria Teresa
08:41	14/07/2026	Mauricio	GRUPO	COLETA	MAURICIO — R.Wania Carvalho Silveira,51/401,Silveira	R$32,00	João Batista
08:50	14/07/2026	Mauricio	AUANDER	COLETA	MAURICIO — R.Cons.Andrade Figueira,22/102,Gutierrez	R$16,00	Silvania
08:53	14/07/2026	Mauricio	AUANDER	COLETA	MAURICIO — Hosp.Felício Rocho,CTI Pediátrico	R$22,00	Ana Tereza
09:10	14/07/2026	Val Fortunato	GRUPO	COLETA	VAL — R.Bernardino de Lima,321,Gutierrez	R$18,00	LN
09:33	14/07/2026	Plural	AUANDER	COLETA	PLURAL — R.João Antônio de Azevedo,320/1102,Belvedere	R$17,00	CASSIA
10:04	14/07/2026	Ammis	GRUPO	COLETA/ENTREGA	AMMIS — R.Helia Ricaldone de Freitas,357,Serrano	R$40,00	Amauri Bispo
10:23	14/07/2026	Elisa Atheni	GRUPO	COLETA	ELISA ATHENIENSE CEARA — R.José de Alencar,700→R.Ceará,1332	R$20,00	Aster
10:36	14/07/2026	Incloset	AUANDER	ENTREGA	INCLOSET — R.João Furtado,200/2201,Gutierrez	R$18,00	Elaine Kumaira
10:39	14/07/2026	Deluza	GRUPO	COLETA/ENTREGA	DELUZA — R.Viçosa,768→R.Jorge Fontana,50/601,Belvedere	R$22,00	WILSON
10:47	14/07/2026	Elisa Atheni	GRUPO	ENTREGA	ELISA ATHENIENSE CEARA — Av.Francisco Sales,1420/1304	R$17,00	Juliana
11:30	14/07/2026	Ammis	AUANDER	ENTREGA	AMMIS — R.Califórnia,546/1000,Sion	R$20,00	Erika Diniz
12:00	14/07/2026	Elisa Atheni	AUANDER	COLETA/ENTREGA	ELISA ATHENIENSE — R.Ceará,1332→Botânico,loja237	R$15,00	Camila/Angela-Tiago
12:13	14/07/2026	Elisa Atheni	AUANDER	COLETA/ENTREGA	ELISA ATHENIENSE CEARA — Botânico,loja237→R.Ceará,1332	R$15,00	CAMILA/Angela-Tiago
12:21	14/07/2026	Opminas	IGOR	ENTREGA	OPMINAS — MATER DEI CONTORNO	R$22,00	L.D.C
12:38	14/07/2026	Tamara	AUANDER	COLETA	TAMARA CAPS — R.Domingos Vieira,273/1001,Sta.Efigênia	R$20,00	Debora 
13:31	14/07/2026	Mauricio	AUANDER	ENTREGA	MAURICIO — R.Lauro Ferreira,192/701,Buritis	R$22,00	Eduardo
13:32	14/07/2026	Mauricio	AUANDER	ENTREGA	MAURICIO — R.Amanda,137,Betânia	R$29,00	Maristela
13:32	14/07/2026	Mauricio	IGOR	ENTREGA	MAURICIO — R.Wania Carvalho Silveira,51/401	R$32,00	João Batista
13:34	14/07/2026	Mauricio	IGOR	ENTREGA	MAURICIO — R.São José do Divino,100,Sta.Branca	R$30,00	Evandro/Célia Bonate
13:53	14/07/2026	Ammis	GRUPO	ENTREGA	AMMIS — Av.Raja Gabáglia,2708/315,Estoril	R$17,00	Áurea
14:02	14/07/2026	Telecom	AUANDER	ENTREGA	TELECOM — Shop.Contagem→Minas Shopping	R$80,00	Amanda
14:12	14/07/2026	M Pitanga	GRUPO	ENTREGA	M PITANGA — R.Dom Aristides Porto,245/401	R$23,00	Karina Pissolato
14:17	14/07/2026	Mauricio	IGOR	COM RETORNO	MAURICIO — R.Augusto de Lima,1674,BlB/508	R$27,00	Edivaldo
14:41	14/07/2026	S Manoel	IGOR	ENTREGA	S MANOEL — R.Ouro Preto,581/1106	R$17,00	Debora maia
14:47	14/07/2026	Hoppe	GRUPO	ENTREGA	HOPPE — Av.Contorno,8256,2ºandar	R$17,00	Nathalia Sudano
14:49	14/07/2026	Opminas	IGOR	COLETA	OPMINAS — MATER DEI NOVA LIMA	R$25,00	L.S.C
14:50	14/07/2026	Elisa Atheni	GRUPO	COLETA/ENTREGA	ELISA ATHENIENSE CEARA — Botânico→R.Ceará,1332	R$15,00	Camila/Angela-Tiago
14:53	14/07/2026	Cesta	AUANDER	ENTREGA	COLETA — Av.Padre Pedro Pinto,322,Venda Nova	R$45,00	Luciene Felix
14:53	14/07/2026	Opminas	IGOR	COLETA	OPMINAS — MATER DEI SANTO AGOSTINHO	R$22,00	Luciene Felix
14:58	14/07/2026	Mauricio	IGOR	ENTREGA	MAURICIO — R.São Tiago,7,São Tomás	R$26,00	Sr.Fagner
15:03	14/07/2026	Mauricio	AUANDER	ENTREGA	MAURICIO — R.Manila,90/208,Havaí	R$22,00	Gustavo
15:31	14/07/2026	Mauricio	AUANDER	ENTREGA	MAURICIO — R.Amélia Pyramo,94,Sta.Helena	R$42,00	Isamara
16:12	14/07/2026	FF Fashion	GRUPO	ENTREGA	FF FASHION — R.Otaviano Fabri,220,Ermelinda	R$26,00	Patricia
16:42	14/07/2026	Mauricio	AUANDER	ENTREGA	MAURICIO — R.Otaviano Carneiro,266,Boa Vista	R$16,00	Françoise
17:09	14/07/2026	FF Fashion	GRUPO	ENTREGA	FF FASHION — R.Estevão Pinto,673/1700	R$16,00	Ana 
17:25	14/07/2026	Cesta	GRUPO	ENTREGA	CESTA — R.Adem,59,Alípio de Melo	R$24,00	Philipe G.Santos
17:50	14/07/2026	Elisa Atheni	GRUPO	ENTREGA	ELISA ATHENIENSE CEARA — R.Ouro Preto,1396/701	R$18,00	Nathalia
19:31	14/07/2026	Kopenhagen	GRUPO	ENTREGA	KOPENHAGEN — Prof.Otávio Coelho de Magalhães,11	R$16,00	Ana
07:52	15/07/2026	Mauricio	EMERSON	COLETA	MAURICIO — R.Wilson Modesto Ribeiro,215/702	R$17,00	Sr Rogerio
08:44	15/07/2026	Plural	AUANDER	ENTREGA	PLURAL — R.Antônio de Albuquerque,749/502	R$18,00	Natália
09:44	15/07/2026	Josi Fraga	AUANDER	ENTREGA	JOSI FRAGA — R.Araraquara,401/601	R$18,00	Juliana
09:46	15/07/2026	Cesta	AUANDER	ENTREGA	CESTA — Av.Contorno,4456,7ºandar	R$17,00	Claudio Casteluber
10:04	15/07/2026	Wandar	EMERSON	ENTREGA	VANDA — R.Serranos,115/301,Serra	R$24,00	Andrea
10:12	15/07/2026	Val Fortunato	AUANDER	ENTREGA	VAL — R.Pedro Natalício,275/403,Buritis	R$20,00	Costureira Raquel
10:56	15/07/2026	FF Fashion	EMERSON	COLETA	FF FASHION — R.Alagoas,772,9ºandar	R$16,00	Maria Rita
10:57	15/07/2026	Plural	AUANDER	ENTREGA PRIORIDADE	PLURAL — R.Paracatu,1300/1502	R$15,00	Jaqueline Passos
11:06	15/07/2026	Kopenhagen	EMERSON	ENTREGA	KOPENHAGEN — R.Americo Scott,63/601,Serra	R$17,00	Renata Rezende
11:10	15/07/2026	Ammis	AUANDER	ENTREGA	AMMIS — R.Marco Paulo Simon Jardim,857/1502,Nova Lima	R$22,00	Cristina Campos
11:11	15/07/2026	Ammis	AUANDER	ENTREGA	AMMIS — Av.Constelações,725/104-2	R$25,00	Valéria/Nicole
11:19	15/07/2026	Opminas	EMERSON	COLETA	OPMINAS — Mater Dei Sto.Agostinho	R$22,00	C.A.S.S/S.C.H
11:20	15/07/2026	Opminas	EMERSON	COLETA	OPMINAS — Instituto	R$27,00	Camila Stephanie/Rafael Henrique
11:27	15/07/2026	Ammis	EMERSON	ENTREGA	AMMIS — Av.Afonso Pena,4121,12ºandar	R$20,00	Juliana Cordeiro
11:40	15/07/2026	Ammis	EMERSON	COLETA	AMMIS — R.Califórnia,546/1000,Sion	R$20,00	Erika Diniz
11:49	15/07/2026	Mari Dants	AUANDER	COLETA/ENTREGA	MARI DANT — R.Pampas,568→R.Esmeraldo Botelho,166/202	R$22,00	Luciana/Luiza
12:01	15/07/2026	Rosa Dalia	AUANDER	ENTREGA	ROSA DALIA — R.Juvenal Melo Senra,317	R$22,00	wallace
12:26	15/07/2026	Ammis	AUANDER	COLETA	AMMIS — Al.do Morro,190/1300,Belvedere	R$15,00	Heloísa
12:43	15/07/2026	Plural	EMERSON	ENTREGA	PLURAL — R.Monserate,188,Vila Castela	R$30,00	Ana Paula Neves
12:44	15/07/2026	Opminas	IGOR	ENTREGA	OPMINAS — Mater Dei Contorno	R$22,00	J.D.L
12:44	15/07/2026	Opminas	IGOR	ENTREGA	OPMINAS — Felício Rocho	R$22,00	Robson Rogerio
12:45	15/07/2026	Opminas	IGOR	ENTREGA	OPMINAS — Vera Cruz	R$22,00	Irene Braga
13:10	15/07/2026	Elisa Atheni	IGOR	ENTREGA	ELISA ATHENIENSE BOTÂNICO — Cond.Passargada	R$55,00	Débora
13:27	15/07/2026	Val Fortunato	AUANDER	ENTREGA	VAL — Alvarenga Peixoto,1408/804	R$18,00	Dr.Eliana
14:35	15/07/2026	Elisa Atheni	IGOR	COLETA/ENTREGA	ELISA ATHENIENSE — R.Ceará→Botânico	R$15,00	Camila/Angela-Tiago
14:42	15/07/2026	Opminas	IGOR	ENTREGA	OPMINAS — Surgical	R$22,00	pcd
15:40	15/07/2026	Elisa Atheni	AUANDER	ENTREGA	ELISA ATHENIENSE CEARA — R.Paraíba,966/1103	R$17,00	Cemila
15:45	15/07/2026	Cesta	AUANDER	ENTREGA	CESTA — Av.Raja Gabáglia,4859/105	R$17,00	Luiza B Vilas
15:46	15/07/2026	Cesta	AUANDER	ENTREGA	CESTA — R.Francisco Bicalho,2375/201	R$20,00	Rubia Mara
17:07	15/07/2026	FF Fashion	AUANDER	ENTREGA	FF FASHION — Pç.Dep.Renato Azeredo,250/601	R$17,00	Fernanda
17:30	15/07/2026	Incloset	AUANDER	ENTREGA	INCLOSET — R.Montes Claros,429/202,Carmo	R$17,00	Carol Baião
17:30	15/07/2026	Natupet 	EMERSON	ENTREGA	NATUPET	R$80,00	Eliana
17:39	15/07/2026	Kopenhagen	AUANDER	ENTREGA	KOPENHAGEN — R.Montes Claros,1099	R$16,00	Lucas
09:08	16/07/2026	M Pitanga	AUANDER	ENTREGA	Rua Costa Rica 147 apto 401, Sion	R$19,00	Michelle Sabarense
09:09	16/07/2026	M Pitanga	AUANDER	ENTREGA	Rua Professor Sylvio Andrade 415, Serrano	R$35,00	Silvia Barbosa Ribeiro
09:54	16/07/2026	Opminas	IGOR	COLETA	Malas novas - 02 malas P	R$37,00	Hudson
10:03	16/07/2026	Ammis	AUANDER	ENTREGA	Rua Ouro Preto 1523, Apto 1102, Santo Agostinho	R$18,00	Vanessa
10:05	16/07/2026	Tamara 	GRUPO	COLETA	Coleta: Av. Barbacena 1219 (prédio Banco Inter) / Entrega: Rua Itamirim 25, Vera Cruz	R$20,00	Abel Odorico
10:12	16/07/2026	M Pitanga	AUANDER	ENTREGA	Rua Doutor Ismael de Faria 169, Luxemburgo	R$18,00	Luciana Dias Macedo
10:17	16/07/2026	M Pitanga	AUANDER	ENTREGA	Rua Castelo Lamego, 555, apt 302, Castelo	R$35,00	Ana Cristina Henriques
10:18	16/07/2026	Incloset	AUANDER	COM RETORNO	Rua Montes Claros, 429 apto 202, Carmo	R$27,00	Carol Baião
10:22	16/07/2026	Elisa Atheni	GRUPO	COM RETORNO	Retirada: Botânico Shopping (Angela/Tiago) / Entrega: R. Ceará, 1332, loja 02 - Funcionários (Camila)	R$15,00	Angela
11:18	16/07/2026	Ammis	AUANDER	ENTREGA	Rua Matias Cardoso 304, Apto 1502, Santo Agostinho	R$18,00	Tathya
11:21	16/07/2026	Incloset	AUANDER	ENTREGA	R Senador Lima Guimarães N 108/4 andar	R$18,00	Paola Sede 2
11:25	16/07/2026	Incloset	AUANDER	TROCA	Rua Cordelina Silveira Matos, 53, apto 302, Estoril	R$27,00	Aida
11:25	16/07/2026	Val Fortunato	AUANDER	COLETA	Rua Pedro Natalício 275, apt 403, Buritis	R$20,00	Costureira Raquel
11:39	16/07/2026	Opminas	IGOR	COLETA	Mala G+ 04 sacolas (PAC: H.M.A/A.S.S/L.D.C.F/J.D.L)	R$22,00	h.m.a
12:17	16/07/2026	Opminas	IGOR	ENTREGA	Mala P+ 01 sacola (PAC: E.D.S.)	R$22,00	e.d.e
13:05	16/07/2026	Amelia	IGOR	COM RETORNO	Coleta: Av. Mário Werneck 2134, Buritis / Entrega: Av. do Contorno 5823, sala 901, Savassi	R$24,00	Amelia
13:24	16/07/2026	M Pitanga	IGOR	ENTREGA	Rua Vereda, 50, apto 1002, torre 3, Vila da Serra, Cond. Metrópole	R$18,00	Érika Corrêa
13:34	16/07/2026	Kopenhagen	IGOR	ENTREGA	R Dona Salvadora N 38, Serra	R$17,00	serra bateria
13:35	16/07/2026	Elisa Atheni	IGOR	ENTREGA	R Teixeira de Freitas, 155, apto 401, B. Santo Antônio	R$17,00	Helena
13:35	16/07/2026	Elisa Atheni	IGOR	COM RETORNO	Retirada: R. Ceará, 1332, loja 02 - Funcionários (Camila) / Entrega: Botânico Shopping (Angela/Tiago)	R$15,00	Angela
13:47	16/07/2026	Plural	IGOR	ENTREGA	Rua Piauí 1052, apt 802, Funcionários	R$17,00	Juliana Nogueira
14:09	16/07/2026	M Pitanga	IGOR	ENTREGA	Rua Progresso 618, loja B, Padre Eustáquio (consultório odontológico)	R$23,00	Eliamar Caetano
14:10	16/07/2026	Elisa Atheni	IGOR	COM RETORNO	Retirada: Botânico Shopping (Angela/Tiago) / Entrega: R. Ceará, 1332, loja 02 - Funcionários (Camila)	R$15,00	Angela
14:14	16/07/2026	Plural	IGOR	ENTREGA	Rua Rio de Janeiro 2300, Apt 1400, Lourdes	R$17,00	Ana Beatriz
15:03	16/07/2026	Elisa Atheni	IGOR	COM RETORNO	R Teixeira de Freitas, 155, apto 401, B. Santo Antônio	R$28,00	Helena
15:10	16/07/2026	Elisa Atheni	IGOR	ENTREGA	Oficina do Salto - R Congonhas N 724, Santo Antônio	R$16,00	Andreia
15:18	16/07/2026	Basique	AUANDER	ENTREGA	Rua Ministro Orozimbo Nonato 395/2305, Vila da Serra	R$21,00	Cris Antunes
15:27	16/07/2026	Mimame	AUANDER	ENTREGA	Rua Paraíba, 1287, apto 901, Savassi	R$21,00	Erika Tristão
15:43	16/07/2026	Incloset	AUANDER	COLETA	Av. Vitório Marcolo N 203, Anchieta	R$18,00	Costureira Cida
16:08	16/07/2026	Plural	GRUPO	COLETA	R Miguel Gomes da Costa N 52, Mantiqueira	R$42,00	Costureira Isabel
16:36	16/07/2026	FF Fashion	IGOR	ENTREGA	Rua Luz, 192/401 - Serra (A/C Thais)	R$16,00	Thais
16:43	16/07/2026	FF Fashion	AUANDER	ENTREGA	Av. Dr. Marco Paulo Simon Jardim, 620, ap 1101 - Piemonte, Nova Lima (A/C Maira Lima)	R$22,00	Maira Lima
16:54	16/07/2026	Elisa Atheni	AUANDER	RETIRADA/ENTREGA	Rua Ceará, 1332, loja 02 - Funcionários (procurar Camila)	R$15,00	Angela
17:57	16/07/2026	Elisa Atheni	IGOR	ENTREGA	Rua Cardeal Stepinac, 170/801 - Cidade Nova (Simone Neves)	R$18,00	Simone Neves
17:57	16/07/2026	Elisa Atheni	IGOR	ENTREGA	Av. Olegário Maciel, 2174/2001 - Santo Agostinho (Paula Vilela Ramos)	R$17,00	Paula
19:12	16/07/2026	FF Fashion	GRUPO	ENTREGA	Rua da Mata, 205, apto 1102, torre 1 - Vila da Serra (Cyntia Nayara)	R$24,00	Cyntia
08:00	17/07/2026	Cesta	GRUPO	CESTA	Rua Pitangui, 2718, apto 602 - Sagrada Família	R$ 18,00	Carolina Castro
09:00	17/07/2026	Cesta	GRUPO	CESTA	Rua Carangola, 703/1101 - Santo Antônio	R$ 18,00	Valeria Castro
08:03	17/07/2026	Basique	AUANDER	BASIQUE	Rua Junquilhos, 600, ap 104 - Nova Suíça	R$ 20,00	Kenia
08:04	17/07/2026	Basique	CANCELADO	BASIQUE	Av. Marechal Castelo Branco, 445, Apto 804 A - JK, Contagem, CEP 32310-010	R$ 40,00	Ludimila
08:06	17/07/2026	Basique	AUANDER	BASIQUE	Rua Antônio Paulino de Castro, 104 ao 604 - Liberdade	R$ 55,00	Tania
08:07	17/07/2026	P&P	IGOR	P&P	R. Santa Maria, 714 - Pedra Azul, Contagem	R$ 25,00	Correios
08:11	17/07/2026	Natupet	IGOR	NATUPET	3 entregas	R$ 100,00	Eliana
08:30	17/07/2026	Basique	AUANDER	BASIQUE	R. Maria Gertrudes Santos, 952 - Céu Azul, BH	R$ 48,00	Costureira Lili
08:31	17/07/2026	Basique	AUANDER	BASIQUE	R. Mato Grosso, 676 - Prado	R$ 20,00	Barbosa
09:19	17/07/2026	M Pitanga	AUANDER	M PITANGA	Rua Professor Sylvio Andrade, 415 - Serrano	R$ 56,00	Silvia Barbosa Ribeiro
09:55	17/07/2026	Opminas	IGOR	OPMINAS	vera cruz	R$ 22,00	Irene Braga
10:55	17/07/2026	Elisa Atheni	IGOR	ELISA ATHENIENSE CEARA	R. Teixeira de Freitas, 155, apto 401 - Santo Antônio	R$ 28,00	Helena
11:05	17/07/2026	Elisa Atheni	IGOR	ELISA ATHENIENSE	Botânico Shopping, Av. Celso Porfírio Machado, 150, Loja 237 - Belvedere	R$ 15,00	Camila / Angela / Tiago
11:20	17/07/2026	Basique	IGOR	BASIQUE	Rua Estácio de Sá, 750/501 - Gutierrez	R$ 18,00	Lurdinha
11:20	17/07/2026	Basique	AUANDER	BASIQUE	Rua Joaquim Figueiredo, 511 - Barreiro	R$ 35,00	Isabela
11:21	17/07/2026	Basique	IGOR	entrega	Av. Augusto de Lima, 1263, Loja 6B	R$ 20,00	Etiqueta
11:21	17/07/2026	Basique	IGOR	BASIQUE	R. Turquesa, 687/01 - Prado	R$ 20,00	Ana Faccao
11:22	17/07/2026	M Pitanga	IGOR	M PITANGA	Rua Costa Machado, 367, apto 202 - Universitário	R$ 33,00	Flavia Ottoni
12:00	17/07/2026	M Pitanga	IGOR	M PITANGA	Rua Major Lopes, 738, apto 1202 - São Pedro	R$ 18,00	Michele Neves
12:25	17/07/2026	Ammis	IGOR	AMMIS	Trazer para Ammis (de Rua Matias Cardoso, 304, Apto 1502 - Santo Agostinho)	R$ 18,00	Tathya
12:26	17/07/2026	Ammis	IGOR	AMMIS	Rua Gonzales Pecotche, 392, ap 1503, t3 - Vila da Serra	R$ 18,00	Amanda
12:50	17/07/2026	Basique	IGOR	BASIQUE	Av. Augusto de Lima, 1263, Loja 6B	R$ 22,00	Viviane Etiquetas
13:22	17/07/2026	Opminas	IGOR	OPMINAS	mater dei contorno	R$ 22,00	j.m.a.t
13:51	17/07/2026	M Pitanga	IGOR	M PITANGA	Rua Campanha, 182/1202 - Sion	R$ 19,00	Melissa Gualberto
14:12	17/07/2026	Cesta	GRUPO	CESTA	Av. Protásio de Oliveira Pena, 253/602 - Buritis	R$ 22,00	Daniel
14:24	17/07/2026	Ammis	igor	AMMIS	Rua Antônio de Albuquerque, 230, Apto 1101 - Savassi	R$ 21,00	Glaucia
14:26	17/07/2026	Elisa Atheni	AUANDER	ELISA ATHENIENSE	Rua Ceará (trazer da Av. Francisco Deslandes, 971, sala 712)	R$ 20,00	Talita
14:38	17/07/2026	M Pitanga	AUANDER	M PITANGA	Rua João Antônio Azeredo, 320, apto 102 - Belvedere	R$ 16,00	Iiamara
14:50	17/07/2026	Val Fortunato	GRUPO	CASA DA VAL	Rua Maria de Lourdes Camelo, 150 - Caiçaras	R$ 30,00	Casa da Val
15:20	17/07/2026	Opminas	GRUPO	OPMINAS	Rua Naná, 165 - Milionários, portão amarelo (GPS nº 769)	R$ 38,00	Antonio Carlos
15:21	17/07/2026	Ammis	IGOR	AMMIS	Rua Embaúba, 215 - Condomínio Ouro Velho	R$ 29,00	Rachel Tergilene
15:56	17/07/2026	FF Fashion	AUANDER	FF FASHION	Rua da Luz Serena, 330 - Vale dos Cristais, Nova Lima	R$ 38,00	Karol
16:10	17/07/2026	Opminas	IGOR	OPMINAS	Av. Álvares Cabral, 980 - Lourdes, BH, CEP 30170-002	R$ 22,00	Arthur
16:13	17/07/2026	Incloset	AUANDER	INCLOSET	Rua Juiz de Fora, 1268, conjunto 604 - Santo Agostinho	R$ 18,00	Marisa Castana
16:28	17/07/2026	Incloset	AUANDER	INCLOSET	Radisson Blue - Rua Lavras, 150 (Hotel)	R$ 17,00	Ana Lívia Canela
16:45	17/07/2026	FF Fashion	AUANDER	FF FASHION	Rua Levy Lafetá, 161, apto 1901 - Belvedere	R$ 22,00	Daniele Franklin
17:21	17/07/2026	Basique	AUANDER	BASIQUE	Rua Estácio de Sá, 750/501 - Gutierrez	R$ 28,00	Lurdinha
17:44	17/07/2026	Basique	AUANDER	BASIQUE	Rua Padre João Crisóstomo, 400, apto 601	R$ 22,00	Marcela
17:44	17/07/2026	Ammis	AUANDER	AMMIS	Rua da Fonte, 110, apto 2602 - Vila da Serra	R$ 18,00	Tayra
17:49	17/07/2026	FF Fashion	AUANDER	FF FASHION	Av. Afonso XIII, 821/202 - Gutierrez	R$ 18,00	Alessandra
17:57	17/07/2026	Elisa Atheni	IGOR	Entrega	Rua Cardeal Stepinac, 170/801 - Cidade Nova	R$ 18,00	Simone Neves
17:57	17/07/2026	Elisa Atheni	IGOR	Entrega	Av Olegário Maciel, 2174/2001 - Santo Agostinho	R$ 17,00	Flavia 
07:50	18/07/2026	Cesta	GRUPO	ENTREGA	 Rua Desembargador Paula Mota, 1565, ap 403, bloco A, bairro Ouro Preto - BH	R$ 23,00	Gilmara
10:45	18/07/2026	FF Fashion	GRUPO	ENTREGA	  Rua Caetano de Azeredo, 600, ap 301, Barreiro de Baixo	R$ 40,00	Deise Erka
11:17	18/07/2026	Cesta	GRUPO	ENTREGA	 Avenida Ribeiro de Paiva, 211, casa 4, Bairro João Pinheiro	R$ 45,00	Marlene
12:01	18/07/2026	Basique	GRUPO	ENTREGA	- Av. Barbacena, 1399, ap 1003, Santo Agostinho	R$ 18,00	Paula Birchal 
12:35	18/07/2026	Basique	GRUPO	ENTREGA e COLETA	- Rua Ministro Orozimbo Nonato, 395, ap 2305, Vila da Serra	R$ 28,00	Cris Antunes 
12:46	18/07/2026	Basique	GRUPO	ENTREGA	 - Rua Riachuelo, 1697, ap 201, Padre Eustáquio	R$ 23,00	Vanessa
12:58	18/07/2026	FF Fashion	GRUPO	COLETA	 Rua da Mata, 205, ap 1102, torre 1, Vila da Serra	R$ 22,00	Cyntia Nayara -
14:03	18/07/2026	FF Fashion	GRUPO	ENTREGA	- Rua Felipe dos Santos, 358, ap 501	R$ 18,00	Georgia Hannas
07:59	20/07/2026	S Manoel	EMERSON	Coleta até 11h	R. Ludgero Dolabela, 249/301, Gutierrez	R$17,00	Kênia Bernadete
10:18	20/07/2026	Basique	AUANDER	Entrega até 12h	R. Almirante Alexandrino, 750, apto 1502, Gutierrez — 2 malinhas disponíveis	R$18,00	Junia Pinheiro
11:26	20/07/2026	Ammis	AUANDER	Entrega	R. São Paulo, 2220/800, Bairro de Lourdes	R$18,00	Maria Cristina
11:40	20/07/2026	Ammis	EMERSON	Coleta a partir das 14h	R. Amoroso Costa, 50, Sala 303/304, Santa Lúcia — trazer p/ Ammis	R$17,00	Glaucia
12:01	20/07/2026	Elisa Atheniense	aUANDER	Retirada/Entrega	Retirada: R. Ceará, 1332, Funcionários (Camila) / Entrega: Botânico Shopping, Belvedere (Angela/Tiago)	R$15,00	Elisa Atheniense
12:19	20/07/2026	Basique	IGOR	Coleta às 14h30	Av. Barbacena, 1399/1003, Santo Agostinho	R$18,00	Paula Birchal
12:38	20/07/2026	Opminas	IGOR	Coleta após 15h	R. Naná, 165 (nº 769 GPS), Milionários, portão amarelo — mala P + 1 sacola	R$38,00	Antonio Carlos
12:39	20/07/2026	Opminas	IGOR	Entrega	Mater Dei Contorno — mala G + 3 sacolas	R$22,00	J.R.P / F.L.DA.B / E.C.G.D
12:43	20/07/2026	Opminas	IGOR	Coleta	Mater Dei Contorno — mala P + 2 sacolas	R$22,00	E.D.S.G / J.M.A.T
13:01	20/07/2026	Elisa Atheni	IGOR	Retirada/Entrega	Retirada: Botânico Shopping, Belvedere / Entrega: R. Ceará, 1332, Funcionários (Camila)	R$15,00	Elisa Atheniense
13:13	20/07/2026	M Pitanga	GRUPO	Entrega até 17h	R. Profª Bartira Mourão, 650, apto 501, Buritis	R$15,00	Alessandra Maciel
13:13	20/07/2026	Basique	IGOR	Entrega e Coleta	R. Min. Orozimbo Nonato, 395/2305, Vila da Serra — malinha já disponível	R$27,00	Cris Antunes
13:14	20/07/2026	Basique	IGOR	Entrega c/ retorno (14h–18h)	R. Rodrigues Caldas, 30, 2º andar, TV Assembleia — receber R$414,00 em dinheiro	R$128,00	Luziana
13:26	20/07/2026	Basique	IGOR	Entrega a partir das 14h30	R. Caraça, 630, apto 301, Serra (ao lado do Epa Plus)	R$21,00	Lisieux Andrade
13:41	20/07/2026	Plural	IGOR	Entrega c/ retorno	Av. Contorno, 2316, 6º andar, Floresta	R$27,00	Lucimara
13:42	20/07/2026	Plural	GRUPO	Entrega	R. Miguel Gomes da Costa, 52, Mantiqueira	R$42,00	Costureira Isabel
13:53	20/07/2026	Val Fortunato	GRUPO	Coleta	Av. Protásio de Oliveira Penna, 322/204, Buritis	R$20,00	Val
14:10	20/07/2026	P&P	EMERSON	Entrega (postagem Correios)	Retirar: Av. Wilson Tavares Ribeiro, 800, Contagem / Deixar: R. Santa Maria, 714, Contagem	R$25,00	Correios
15:16	20/07/2026	Opminas	IGOR	Entrega	São Camilo — mala P + sacola	R$25,00	Victor Rocha
16:03	20/07/2026	Ammis	IGOR	Troca	Pegar na Ammis, levar R. da Fonte, 110, apto 2602, Vila da Serra e coletar mercadoria de volta	R$27,00	Tayra
16:06	20/07/2026	Ammis	IGOR	Coleta	R. Gonzales Pecotche, 392, apto 1503, T3, Vila da Serra — trazer p/ Ammis	R$16,00	Amanda
16:25	20/07/2026	Ammis	IGOR	Entrega	Pegar na Ammis, levar R. Dr. Marco Paulo Simon Jardim, 857, apto 1502, Atlantic	R$16,00	Lora
16:42	20/07/2026	Elisa Atheni	IGOR	Retirada/Entrega	Retirada: Botânico Shopping, Belvedere (Angela/Fernanda) / Entrega: R. Bernardo Guimarães, 2551, apto 1402, Santo Agostinho	R$17,00	Camila
18:03	20/07/2026	Cristina Guadros / Patrícia	CANCELADO	Coleta/Entrega	Coleta: R. Matias Cardoso, 236/1203, Santo Agostinho / Entrega: R. Pernambuco, 619/1002, Funcionários	R$25,00	Miss Delle
18:05	20/07/2026	Lepoeh	EMERSON	Entrega	R. Patagônia, 1023, Sion	R$15,00	Aristheatotti
18:05	20/07/2026	FF Fashion	GRUPO	Entrega	R. Lua, 500, apto 801, Santa Lúcia	R$17,00	Gisele Estorine
18:07	20/07/2026	Telecom	EMERSON	Entrega	Itaú Power — Shopping Contagem, Minas Shopping, Big Shopping, Via Barreiro, Estação 2	R$160,00	Amanda
18:09	20/07/2026	Sara	AUANDER	Entrega	21 coletas — percurso de 65 km	R$173,00	Sara
18:10	20/07/2026	FF Fashion	IGOR	Entrega	R. Profª Kalman Sibalszky, 145, casa 28, Garças	R$45,00	Adriane Zoglio
18:15	20/07/2026	Renata	EMERSON	Entrega	R. Enize, 245, Sion	R$15,00	Renata
07:20	21/07/2026	Cesta	GRUPO	ENTREGA	Lucas Felipe	R$18,00	Rua dos Guaranis, 256 - Centro - Loja do Biscoito
07:34	21/07/2026	Miss dele	AUANDER	COLETA/ENTREGA	Patricia	R$25,00	Coleta: Cristina Guadros - R Matias Cardoso 236/1203 Santo Agostinho; Entrega: R Pernambuco 619/1002 Funcionários
09:08	21/07/2026	Basique	AUANDER	ENTREGA	Junia Pinheiro	R$18,00	Rua Almirante Alexandrino, 750 apto 1502 - Gutierrez (até 11h)
09:59	21/07/2026	S Manoel	IGOR	ENTREGA	Patrícia de Deus	R$17,00	Rua Tomé de Souza 1244/402 (até 12h)
09:59	21/07/2026	S Manoel	IGOR	COLETA	Kênia Bernadete	R$17,00	Rua Ludgero Dolabela, 249/301 - Gutierrez (até 12h)
09:59	21/07/2026	S Manoel	IGOR	ENTREGA	Janaina Araújo	R$18,00	Rua Antônio Aleixo n300/1001 Lourdes - deixar na portaria
10:01	21/07/2026	Cesta	GRUPO	ENTREGA	Maria Eduarda	R$20,00	Rua dos Bandolins 215, Cond. California, Torre 3, apto 206 - retirada 11h/entrega até 12h
10:49	21/07/2026	Val	IGOR	COLETA	Jane	R$18,00	Sara Santos - R Brumadinho 438 - Prado
10:58	21/07/2026	Ammis	EMERSON	ENTREGA	Fábrica Ammis	R$16,00	Av. Raja Gabaglia, 2708 sala 315 - procurar Áurea
11:59	21/07/2026	Opminas	IGOR	ENTREGA	Vila da Serra	R$25,00	PAC: André Couto - Mala G + Sacola
12:05	21/07/2026	Opminas	IGOR	ENTREGA	Mater Dei Contorno	R$22,00	PAC: A.C.B / A.D.M.C - 02 Sacolas
12:05	21/07/2026	Opminas	IGOR	COLETA	Mater Dei Contorno	R$22,00	PAC: J.R. - Mala G + Sacola (patrimônio OPI0019)
12:06	21/07/2026	Opminas	IGOR	COLETA	Instituto	R$20,00	PAC: Sarah Santos - Mala P + Sacola
12:17	21/07/2026	Ammis	EMERSON	ENTREGA/COLETA	Amanda	R$27,00	Rua Gonzales Pecotche 392, ap 1503 T3 - Vila da Serra (com retorno)
12:18	21/07/2026	Opminas	IGOR	ENTREGA	Carlito	R$22,00	PAC: Manutenção Volume - Mala G (patrimônio OPI0019)
12:28	21/07/2026	Cesta	GRUPO	ENTREGA	Bebelys	R$28,00	Rua José Ambrósio Diniz nº100 apt 201 - Minaslândia - Caixa verde
12:34	21/07/2026	M pitanga	EMERSON	ENTREGA	Cris Leroy	R$20,00	Rua dos Aimorés, 2001 sala 712 - até 16h
12:35	21/07/2026	M pitanga	EMERSON	ENTREGA	Bruna Carmo	R$21,00	Rua Ramalhete 337 apto 501 - Anchieta - até 17h
12:59	21/07/2026	Cesta	EMERSON	ENTREGA	Rafael Oliveira e Beatriz Couto	R$22,00	Rua Castelo de Setúbal 65, ap 303, Bairro Castelo, BH - retirada 15h - Caixa coração
13:06	21/07/2026	Mimame	IGOR	ENTREGA	Rua Oriente	R$18,00	Nº685, Apto 500, Bairro Serra, BH, CEP 30220270
13:41	21/07/2026	FF Fashion	EMERSON	COLETA/ENTREGA	Gabriela	R$20,00	Coleta: Loja Fashion; Entrega: Rua Cuiabá 1077, Prado - Anne Fernandes
14:09	21/07/2026	Cesta	AUANDER	ENTREGA	Fernanda e Wagner	R$20,00	Rua Cônego Floriano 115 - Cesta com tecido colorido
14:10	21/07/2026	S Manoel	AUANDER	ENTREGA	Aura Celeste	R$17,00	Rua Padre Severino, 177, apto 302 - São Pedro - até 16h
14:10	21/07/2026	Basique	AUANDER	ENTREGA	Patrícia Dornelas	R$21,00	Rua Alagoas 1049 - Savassi - deixar com porteiro
15:05	21/07/2026	Opminas	IGOR	ENTREGA	Vera Cruz	R$22,00	PAC: Robson Rodrigo - Mala G + Sacola
16:05	21/07/2026	Elisa atheniense	IGOR	COLETA/ENTREGA	Elisa Atheniense	R$20,00	Coleta: Aster Gráfica - Rua José de Alencar 700, Nova Suíça; Entrega: Rua Ceará 1332, loja 2, Funcionários
16:06	21/07/2026	Basique	AUANDER	ENTREGA	Lara	R$21,00	Rua Turquesa 197, casa - Prado (Junia)
16:07	21/07/2026	Opminas	IGOR	ENTREGA	Santa Casa BH	R$25,00	PAC: Jucilene Aparecida - Av. Francisco Sales nº1111, 2º andar, Centro Cirúrgico - procurar Jacson/Flavia/Raphael/Pedro/Gabriel
16:09	21/07/2026	M pitanga	AUANDER	ENTREGA	Mada Fernandes	R$15,00	Av. Dep. Cristovam Chiaradia 200, Bloco 3 apto 603 - Buritis
16:22	21/07/2026	Val	AUANDER	ENTREGA	Aila	R$16,00	Rua Palmira, 274/202 - Serra - deixar aos meus cuidados
16:59	21/07/2026	Opminas	IGOR	COLETA	Carlito	R$22,00	PAC: Manutenção Volume - Mala G (patrimônio OPI0019)
17:33	21/07/2026	Opminas	IGOR	ENTREGA	Mater Dei Contorno	R$22,00	PAC: I.L.R / A.D.G - Mala G + 02 Sacolas
17:58	21/07/2026	Ammis	AUANDER	ENTREGA	Ana Lúcia	R$19,00	Rua Patagônia, 983, apto 1101 B - Sion
18:19	21/07/2026	Mauricio	IGOR	COLETA/ENTREGA	Silvana	R$18,00	Coleta: Av. Brasil 283 sl 903/904; Entrega: Rua Conselheiro Andrade Figueira 22, apto 102, Gutierrez
19:22	21/07/2026	Mauricio	IGOR	COLETA/ENTREGA	Marcos	R$26,00	CPAP Minas - Coleta: Av. Brasil 283 sla 903/904; Entrega: Rua Lídia 72 - CPAP liberado
""".strip()