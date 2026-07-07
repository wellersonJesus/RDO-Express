"""
Base de dados BRUTA (formato WhatsApp exportado do grupo RDOEXPRESS).

Cada mensagem segue o padrão:
    [HH:MM, DD/MM/YYYY] RDOEXPRESS: <corpo>

O corpo pode conter UM ou VÁRIOS pedidos concatenados, cada um
finalizado por uma linha "EMPRESA $VALOR" (ex: "AMMIS$18.00").

Este arquivo é apenas o repositório do dado bruto. Toda a lógica de
parsing/consolidação vive em geraDadosGrupo.py.
"""

DADOS_BRUTOS = """
[15:02, 01/07/2026] RDOEXPRESS: ENTREGA
ALEXIA

Rua Professor Estevão Pinto 710
Apto 302

PLURAL $16.00
[15:05, 01/07/2026] RDOEXPRESS: INSTITUTO 
COLETA MALA G + SACOLA

PAC: MARIO JO

OPMINAS $20.00
[15:40, 01/07/2026] RDOEXPRESS: ENTREGA

Retirar na rua turfa 389 


Entregar na Rua dias adorno, 39 apto 1303
 santo agostinho em nome de Natália


ROSA DALIA$17.00
[16:07, 01/07/2026] RDOEXPRESS: ENTREGA

Márcia Andrade  
Dr Marco Paulo Simão , 150/ ao 1402. Belvedere. Em frente a fundação torino .

M PITANGA $16.00
[16:13, 01/07/2026] RDOEXPRESS: ENTREGA
FABÍOLA 

Rua dos Aimorés 2450 apto 1102 LOURDES 

VAL $17.00
[16:38, 01/07/2026] RDOEXPRESS: ENTREGA


Coletar na FF 
Levar : Rua Cypriano de Souza Coutinho, 47, Ap 1002
Belvedere 
A/C Cleide

FF FASHION $22.00
[16:46, 01/07/2026] RDOEXPRESS: Retirada: Rua Ceará, 1332, loja 02 - Funcionários 
(Procurar por Camila)

Entrega:  Rua Oriente, 617 - Serra
(Juçara Faria)

ELISA ATHENIENSE CEARA $17.00
[16:57, 01/07/2026] RDOEXPRESS: Favor pegar uma malinha aqui na Ammis e deixar no endereço:

Rua Engenheiro Amaro Lanari, 66 
Apto 1400
Anchieta

Cliente Fabiana

AMMIS$18.00
[17:01, 01/07/2026] RDOEXPRESS: ENTREGA
ELISANGELA 

Rua Benedito Nogueira Vilela,47 Heliopolis. BH

*VAL$36.00
[17:33, 01/07/2026] RDOEXPRESS: ENTREGA

LEONAN: Rua Castelo de Avis, 155 - Apt 402

CLAUDIA: 
Prof Antônio aleixo 765/701 Lourdes

ALEXANDRA: Avenida Amazonas, 4676 - Nova Suissa

ELIANA: Rua Sylvio Andrade, 534 apto 401

ELIANA APARECIDA: Rua ivartt maria Motta 204 são João Batista.


NATUPET $110.00
[17:50, 01/07/2026] RDOEXPRESS: ENTREGA


Lindaura 
Rua Rodrigo otaviano coutinho 320- 700
Belvedere

AMMIS$15.00
[17:51, 01/07/2026] RDOEXPRESS: ENTREGA
Cliente Fayga 

Rua almirante alexandrino 750-1301
Gutierrez

AMMIS$18.00
[09:21, 02/07/2026] RDOEXPRESS: ENTREGA

Juliana Almeida.

Endereço. Rua Matipó 299/apt 102
Santo Antônio.

VAL$18.00
[09:31, 02/07/2026] RDOEXPRESS: ENTREGA

Maria pitanga 
Juliana Borges 
Rua Santa Rita 221
Olhos Dagua 
Geosol 
Juliana Borges DHO 
Ramal 225 
Entregar até 12g

M PITANGA $22.00
[09:44, 02/07/2026] RDOEXPRESS: COLETA

Bom dia!
Retirar 👇🏻 por favor até 12:00
A secretária está lá para entrega a sacola

Ana Adalgisa 
Rua Agostinho Bretas 436 -701
Caiçara

AMMIS$30.00
[09:48, 02/07/2026] RDOEXPRESS: COM RETORNO

SOLICITANTE: CPAP Minas 
MERCADORIA: máscara 
COLETA: av Brasil 283 SL 903/904
ENTREGA: rua Manaus 445, São Lucas 
HORÁRIO ESTIMADO P/ PEGAR ENCOMENDA: já está liberado 
OBS: fazer uma troca deixar uma máscara e trazer outra 
Procura por Cesar +55 31 8977-1198

MAURICIO $24.00
[09:57, 02/07/2026] RDOEXPRESS: ENTREGA

COSTUREIRA RAQUEL: 

Mudou de endereço ( OBS) 

Meu endereço 
Rua Pedro Natalício 275 apt 403 Buritis

VAL$20.00
[10:21, 02/07/2026] RDOEXPRESS: ENTREGA ate 13h30
MARCIA CARDOSO

Rua Equador, 264 ap 604 SAO PEDRO

PLURAL$17.00
[10:46, 02/07/2026] RDOEXPRESS: INSTITUTO 
ENTREGA MALA G + SACOLA

PAC: LEIDIANE VIEIR

OPMINAS $20.00
[10:46, 02/07/2026] RDOEXPRESS: FELICIO ROCHO 
ENTREGA 01 SACOLA

PAC:  MARIA BERNARDES

OPMINAS $22.00

[12:03, 02/07/2026] RDOEXPRESS: ENTREGA

CAROLINA: rua Henrique furtado Portugal, 181/602 buritis 


RAFAEL: rua São João evangelista, 644 número 202 Santo Antônio 

NATUPET $62.00
[12:17, 02/07/2026] RDOEXPRESS: ENTREGA

* DEL REY
* SHOPPING CONTAGEM
* ESTAÇÃO 1
* SHOPPING PARTAGE
* MINAS SHOPPING 
* ESTAÇÃO 2
* VIA BARREIRO 
* SHOPPING ITAU POWER 
* BIG SHOPPING 


TELECOM $330.00
[12:24, 02/07/2026] RDOEXPRESS: ENTREGA


* Rua Santa Marta 85/ São Gabriel/ William 
* 
* Rua Soledade Minas  n°9/ São Gabriel/Carlinhos
* 
DELUZA $40.00
[12:42, 02/07/2026] RDOEXPRESS: ENTREGA URGENTE

COSTUREIRA LUIZA
AV: PROF. MARIO WERNECK N: 2900/L-20 BURÍTIS

VAL F. $20.00,
[13:01, 02/07/2026] RDOEXPRESS: COLETA

Fabiola taranto 

Ruas dos Aimorés 2450 apto 1102 
Lourdes

VAL$18.00
[13:08, 02/07/2026] RDOEXPRESS: COLETA
CAMILA

Rua Abadessa Gertrudes Prado 201 sao Bento

FF FASHION $17.00
[13:15, 02/07/2026] RDOEXPRESS: ENTREGA


Levar : Rua João Carlos, 1486/501
Sagrada Familia
A/C Adriana

FF FASHION $23.00
[13:27, 02/07/2026] RDOEXPRESS: COLETA
SARA SANTOS
JANE

R BRUMADINHO N 438- PRADO

VAL$18.00
[13:27, 02/07/2026] RDOEXPRESS: ENTREGA

Maria pitanga 
Luciana Almeida 
condomínio Village terrasse 
Nova Lima

*M PITANGA $24.00
[13:29, 02/07/2026] RDOEXPRESS: ENTREGA
LETICIA 

rua Ludgero Dolabela, 857 apto 602 GUTIERREZ 

ELISA ATHENIENSE BOTÂNICO $18.00
[13:41, 02/07/2026] RDOEXPRESS: Maria Pitanga. 
Marlimara Meneghi Hallak
Roupas 
Desembargador Jorge Fontana 250 bloco 2 apto 1903
Belvedere 
 Entregar até 16 hs 

M PITANGA $16.00
[13:56, 02/07/2026] RDOEXPRESS: COLETA

Recolher DEPOIS DAS 14:00

Na Glacilene 

Rua Roma 145 /801 Santa Lúcia

AMMIS$17.00
[13:56, 02/07/2026] RDOEXPRESS: COLETA
LN
KASSINHA 

BERNARDINO DE LIMA N 321 GUTIERREZ

ENTREGA

COSTUREIRA RAQUEL: 

Mudou de endereço ( OBS) 

Meu endereço 
Rua Pedro Natalício 275 apt 403 Buritis



VAL$22.00
[14:40, 02/07/2026] RDOEXPRESS: ENTREGA
Karla.

Rua Espírito Santo 2.568 apt 1201
Lourdes

VAL$18.00
[14:44, 02/07/2026] RDOEXPRESS: MATER DEI SANTO AGOSTINHO 
ENTREGA 01 SACOLA

PAC: M.S.B

OPMINAS $22.00
[14:45, 02/07/2026] RDOEXPRESS: COLETA
SARA SANTOS
JANE

R BRUMADINHO 438 PRADO

ENTREGA

Rua Alessandra Salum Cadar 960
Buritis
Casa 2

JACIRA$22.00
[14:53, 02/07/2026] RDOEXPRESS: COLETA

Rua Engenheiro Amaro Lanari, 66 
Apto 1400
Anchieta

Cliente Fabiana

AMMIS$18.00
[15:02, 02/07/2026] RDOEXPRESS: ENTREGA
MARCY

Rua Bernardo Guimarães 2272.  Ap. 601.    Lourdes entre Olegário e Santa Catarina

VAL$18.00
[15:10, 02/07/2026] RDOEXPRESS: COLETA
Por favor buscar sacola lá na 
Maria teresa e trazer na loja 

Maria pitanga 
Roupas 
Maria Teresa 
Rua Vicente Guimarães 35 apto 1302 
Belvedere

M PITANGA $16.00
[15:17, 02/07/2026] RDOEXPRESS: ENTREGA

Rua Jeferson 60, apto 601 Bairro União 
Para: Camila

JOSI FRAGA, $22.00

ENTREGA
DONA.LUCIA

Alameda flamboyant 1231 vila Maria Regina Juatuba

MAURICIO $120.00
COM RETORNO

SOLICITANTE: Vanessa 
MERCADORIA: vedação 
COLETA: Av Brasil 283 sl 903/904 
Bairro  Santa Efigênia 
ENTREGA: Rua Brasópolis n 182
Bairro : Floresta 
Ref: casa verde 
HORÁRIO já está disponível p recolher 
ENCOMENDA: Reinaldo / procurar Lidyane 
Tel : 31  99284-5914

Pagamento Crédito R$150.00

MAURICIO $26.00
Maria Pitanga 
Isabela Menezes 
Rua Tito Guimarães 12 apto 1401
Buritis 
Entregar até 13h

M PITANGA $15.00
COM RETORNO

SOLICITANTE: CPAP Minas 
MERCADORIA: CPAP 
COLETA: av Brasil 283 SL 903/904
ENTREGA: rua angra dos reis 336 casa 4, São Pedro, esmeraldas
HORÁRIO ESTIMADO P/ PEGAR ENCOMENDA: entregar em esmeraldas às 16 horas 
OBS: vai fazer uma troca de CPAP vai levar um e trazer o outro para a empresa 
Roberto (31) 99244-5235

MAURICIO $142.00
ENTREGA ATÉ 14h
LOJA INCLOSET

ESCRITORIO IN CLOSET
R. HERCULANO DE FREITAS N: 1567 - GUTIERREZ

IN CLOSET R$18,00
ENTREGA ate 13h30

Vanessa

João Antônio Cardoso, 580, apto 901 ouro preto 

INCLOSET $55.00
COM RETORNO ate 13h30

COSTUREIRA LUIZA
AV: PROF. MARIO WERNECK N: 2900/L-20 BURÍTIS

VAL F. $32.00,
SOLICITANTE: CPAP Minas 
MERCADORIA: CPAP 
COLETA: av Brasil 283 SL 903/904
ENTREGA:  rua Sergipe 472 AP 704, boa viagem
HORÁRIO ESTIMADO P/ PEGAR ENCOMENDA: já está liberado 
OBS: Maria Eliza 996746010

MAURICIO $18.00
SOLICITANTE: CPAP Minas 
MERCADORIA: 2 máscaras e 3 traquéias 
COLETA: rua Tamarindos 50, Eldorado 
ENTREGA: av Brasil 283 SL 904/903
HORÁRIO ESTIMADO P/ PEGAR ENCOMENDA: já está liberado (o mais rápido que conseguir estamos precisando do material aqui na empresa)
OBS: procurar por Angélica

MAURICIO $35.00
ENTREGA
GRACA

Meu nome é Graça 
Endereço: Av. Francisco Sá, 220, Apto 03 - Bairro Prado

CACAU SHOW $15.00
COLETA
SARA SANTOS
JANE

R BRUMADINHO N 438- PRADO

VAL$18.00
ENTREGA

Pegar aqui uma malinha pequena levar .
na Lindaura 
Rua Rodrigo otaviano coutinho 320- 700
Belvedere

AMMIS$15.00
ENTREGA

Rua Flavita Bretas 609/901
Luxemburgo 
Fernanda

ELISA ATHENIENSE BOTÂNICO $17.00
Retirada:  Rua Ceará, 1332, loja 02 - Funcionários 
(Procurar por Camila)


ENTREGA: Botânico Shopping / Av. Celso Porfírio Machado, 150 - Loja 237 - Belvedere
(Procurar por Angela/Tiago)

ELISA ATHENIENSE $15.00
Retirada: Botânico Shopping / Av. Celso Porfírio Machado, 150 - Loja 237 - Belvedere
(Procurar por Angela/Tiago)

Entrega:  Rua Ceará, 1332, loja 02 - Funcionários 
(Procurar por Camila)

ELISA ATHENIENSE CEARA $15.00
SOLICITANTE: CPAP Minas 
MERCADORIA: 4 caixas pequenas 
COLETA: av Brasil 283 SL 903/904
ENTREGA: rua Portugal 102 , Glória Contagem 
HORÁRIO ESTIMADO P/ PEGAR ENCOMENDA: já está liberado 
OBS: Fernanda 31996412523
Cada Verde

MAURICIO $40.00
ENTREGA
Pegar Brug

Entregar Antônio 
Rua Laranjal 323 / 1500 - Anchieta.

BRENO$18.00
ENTREGA

Bom dia 
Maria Pitanga 
Flavia Ottoni 
Rua Costa Machado 367 apto 202 
Universitário 
Entregar de 15h as 17:30

M.PITANGA $33.00
ENTREGA
PAMELA

R MARCO AURÉLIO DE MIRANDA N 170 BURITIS 

ROSA DALIA $20.00
ENTREGA

R FRANCISCO DESLANDES N 1072/1003 ANCHIETA 

VAL$18.00
ENTREGA

LERIDA

R: SANTA RITA DURÃO N:1056/300 T: 1 - FUNCIONARIOS


INCLOSET $19.00
COLETA

Juliana
Rua das Acacias, 310 apto 1002 vale do sereno

ELISA ATHENIENSE BOTÂNICO $20.00  

FELICIO ROCHO 
COLETA 02 MALAS P + 02 SACOLA

PAC: RAQUEL MARIA
PAC: SHEILA MACHADO

OPMINAS $29.00
INSTITUTO DE OTORRINO 
COLETA 02 MALAS P + 01 SACOLA

PAC: KAUAN RAMOS 

OPMINAS $27.00
ENTREGA
JUNIA

Rua Almirante Alexandrino, 750 apto. 1502 - Gutierrez

AMMIS$18.00
ENTREGA

Rua Piaui,883/1401. Bairro Funcionarios

Flavia Netto

ELISA ATHENIENSE BOTÂNICO $16,00
Retirada: Botânico Shopping / Av. Celso Porfírio Machado, 150 - Loja 237 - Belvedere
(Procurar por Angela/Tiago)

Entrega:  Rua Ceará, 1332, loja 02 - Funcionários 
(Procurar por Camila)

ELISA ATHENIENSE CEARA $15.00
ENTREGA
FERNANDA 

Rua dos Timbiras, 1754, 4º andar, Lourdes.

AMMIS$18.00
COLETA


Rua Jandyra da Costa Mourão 140
Bairro São Bento


Entregar nesse Jessica: 
Avenida Amazonas, 115 -  Sala 1401 - Andar 14 - Centro (Edifício Caxias).

ANA$20.00
COLETA

SOLICITANTE: Vanessa 
MERCADORIA: CPAP 
COLETA: Rua Campos Dos Vales n 16 
Bairro : Marmeleiro / Betim 
ENTREGA: av Brasil 283 SL 903/904
HORÁRIO já está disponível p recolher 
ENCOMENDA: Adilson Carlos 
Tel : 31 99215-4777

MAURICIO $100.00
COLETA
Edna

Rua dos Aimorés, 1065, apto 1301 Funcionários 

INCLOSET $21.00
COLETA
LUCIMARA

AV CONTORNO 2316/6 ANDAR- FLORESTA 

BETE PLURAL DIAMOND MALL $15.00
ENTREGA PRIORIDADE

SOLICITANTE: Vanessa 
MERCADORIA: Cpap 
ENTREGA: Rua Rio Verde n 505 apt 700  
Bairro Carmo Sion 
COLETA: av Brasil 283 SL903/904 
HORÁRIO ESTIMADO : LIBERADO 
OBS: Carlos tel 9911-6871

MAURICIO $18.00
INSTITUTO DE OTORRINO 
ENTREGA MALA P + 01 SACOLA

PAC: HYAGO LUIS

OPMINAS $20.00
MATER DEI CONTORNO 
ENTREGA MALA P + 01 SACOLA

PAC: M.D.E.O

OPMINAS $22.00
SURGICAL 
ENTREGA MALAS P 

PAC: MANUTENÇÃO GARANTIA NSK 0028- IRRIGAÇÃO

OPMINAS $22.00
SURGICAL 
COLETA MALAS G

PAC: RETORNO MANUTENÇÃO E CALIBRAÇÃO LINVATEC 008

OPMINAS $22.00
VILA DA SERRA 
COLETA MALA G + 02  SACOLAS

PAC: O.F.M.D.A ( ou nome GABRIEL trocou) dentro da mala
PAC: THEO HENRIQUE

OPMINAS $22.00
MATER DEI CONTORNO 
COLETA  02 SACOLAS

PAC: IAN REIS
PAC: M.D.E.O

OPMINAS $22.00
ENTREGA

Maria Pitanga 
Sueli Veronica de Souza 
Rua Eufrates 30 São Salvador 
Colégio CEM 
Entregar até 15h

M PITANGA $35.00
SÃO LUCAS
COLETA 01 SACOLA

PAC: HORTENCIA NAIARA


liguei lá esta com Nicolas no térreo

OPMINAS $22.00
MATER DEI  SANTO AGOSTINHO 
ENTREGA 01 SACOLA

PAC:  S.C.H

OPMINAS $22.00
ENTREGA


SOLICITANTE: Vanessa 
MERCADORIA: Cpap 
ENTREGA: Rua Amanda 137
Bairro Betânia 
COLETA: av Brasil 283 SL903/904 
HORÁRIO ESTIMADO : LIBERADO 
OBS: Maristela tel 998853008

MAURICIO $29.00
ENTREGA


SOLICITANTE: Vanessa 
MERCADORIA: Cpap 
ENTREGA: Rua Jesus Machado Gontijo n 75
Bairro Ouro Preto 
COLETA: av Brasil 283 SL903/904 
HORÁRIO ESTIMADO : LIBERADO 
OBS: Marcelo tel 999787945
Receber Pix R$710.00

MAURICIO $30.00
ENTREGA

Juliana Cordeiro

Av; Afonso Pena  4121, 12 andar

AMMIS$18.00

""".strip()
