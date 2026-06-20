// Dados mockados (MVP navegável)
export const empresasPonto = [
  { id: "1", razao: "Pilar Indústria LTDA", cnpj: "12.345.678/0001-90", filiais: 3, funcionarios: 142 },
  { id: "2", razao: "Pilar Comércio S.A.", cnpj: "98.765.432/0001-10", filiais: 1, funcionarios: 38 },
];
export const filiais = [
  { id: "f1", empresa: "Pilar Indústria LTDA", nome: "Matriz", cidade: "São Paulo/SP", funcionarios: 88 },
  { id: "f2", empresa: "Pilar Indústria LTDA", nome: "Filial Campinas", cidade: "Campinas/SP", funcionarios: 32 },
  { id: "f3", empresa: "Pilar Indústria LTDA", nome: "CD Guarulhos", cidade: "Guarulhos/SP", funcionarios: 22 },
];
export const departamentos = [
  { id: "d1", nome: "Produção", filial: "Matriz", funcionarios: 45 },
  { id: "d2", nome: "Administrativo", filial: "Matriz", funcionarios: 18 },
  { id: "d3", nome: "Logística", filial: "CD Guarulhos", funcionarios: 22 },
];
export const escalas = [
  { id: "e1", nome: "5x2 Comercial", jornada: "08:00–18:00", intervalo: "1h", carga: "44h/sem" },
  { id: "e2", nome: "12x36 Diurno", jornada: "07:00–19:00", intervalo: "1h", carga: "180h/mês" },
  { id: "e3", nome: "Turno Noturno", jornada: "22:00–06:00", intervalo: "1h", carga: "44h/sem" },
];
export const feriados = [
  { id: "h1", data: "2026-01-01", nome: "Confraternização Universal", tipo: "Nacional" },
  { id: "h2", data: "2026-04-21", nome: "Tiradentes", tipo: "Nacional" },
  { id: "h3", data: "2026-07-09", nome: "Revolução Constitucionalista", tipo: "Estadual (SP)" },
];
export const funcionarios = [
  { id: "u1", nome: "Ana Souza", cpf: "123.456.789-00", matricula: "0001", cargo: "Analista RH", escala: "5x2 Comercial", filial: "Matriz", status: "Ativo" },
  { id: "u2", nome: "Carlos Lima", cpf: "234.567.890-11", matricula: "0042", cargo: "Operador Produção", escala: "12x36 Diurno", filial: "Matriz", status: "Ativo" },
  { id: "u3", nome: "Beatriz Mendes", cpf: "345.678.901-22", matricula: "0107", cargo: "Conferente", escala: "Turno Noturno", filial: "CD Guarulhos", status: "Ativo" },
  { id: "u4", nome: "Diego Rocha", cpf: "456.789.012-33", matricula: "0210", cargo: "Vendedor", escala: "5x2 Comercial", filial: "Filial Campinas", status: "Afastado" },
];
export const registros = [
  { id: "r1", funcionario: "Ana Souza", data: "2026-06-19", entrada: "08:02", saidaIntervalo: "12:00", retornoIntervalo: "13:01", saida: "18:05", score: 8, dispositivo: "App Android · Aut.", gps: "-23.5505, -46.6333" },
  { id: "r2", funcionario: "Carlos Lima", data: "2026-06-19", entrada: "06:58", saidaIntervalo: "—", retornoIntervalo: "—", saida: "19:02", score: 12, dispositivo: "Control iD · Matriz", gps: "—" },
  { id: "r3", funcionario: "Beatriz Mendes", data: "2026-06-19", entrada: "22:15", saidaIntervalo: "02:00", retornoIntervalo: "03:00", saida: "06:05", score: 72, dispositivo: "App iOS · NÃO Aut.", gps: "-23.4732, -46.5331" },
];
export const tratamento = [
  { id: "t1", funcionario: "Ana Souza", data: "2026-06-19", atraso: "00:02", falta: "—", saidaAntec: "—", extra: "00:05", noturno: "—", saldoBanco: "+00:03" },
  { id: "t2", funcionario: "Carlos Lima", data: "2026-06-19", atraso: "—", falta: "—", saidaAntec: "—", extra: "00:02", noturno: "—", saldoBanco: "+00:02" },
  { id: "t3", funcionario: "Beatriz Mendes", data: "2026-06-19", atraso: "00:15", falta: "—", saidaAntec: "—", extra: "—", noturno: "07:50", saldoBanco: "-00:15" },
  { id: "t4", funcionario: "Diego Rocha", data: "2026-06-19", atraso: "—", falta: "1d", saidaAntec: "—", extra: "—", noturno: "—", saldoBanco: "-08:00" },
];
export const ajustes = [
  { id: "a1", funcionario: "Ana Souza", data: "2026-06-18", motivo: "Esqueci de bater saída", anexo: "comprovante.pdf", status: "Pendente" },
  { id: "a2", funcionario: "Carlos Lima", data: "2026-06-17", motivo: "Falha no relógio Control iD", anexo: "foto.jpg", status: "Aprovado" },
  { id: "a3", funcionario: "Beatriz Mendes", data: "2026-06-16", motivo: "Atestado médico", anexo: "atestado.pdf", status: "Reprovado" },
];
export const equipamentos = [
  { id: "eq1", nome: "iDClass Matriz", ip: "192.168.10.20", status: "Online", ultimaSync: "há 2 min", firmware: "1.42.3" },
  { id: "eq2", nome: "iDClass Portaria", ip: "192.168.10.21", status: "Online", ultimaSync: "há 4 min", firmware: "1.42.3" },
  { id: "eq3", nome: "iDClass CD Guarulhos", ip: "200.150.10.55", status: "Offline", ultimaSync: "há 3h", firmware: "1.40.1" },
];
export const logsEquip = [
  { id: "l1", equip: "iDClass Matriz", quando: "12:01:23", evento: "Sync OK", detalhe: "42 registros recebidos" },
  { id: "l2", equip: "iDClass CD Guarulhos", quando: "09:14:11", evento: "Timeout", detalhe: "Sem resposta em 30s" },
  { id: "l3", equip: "iDClass Portaria", quando: "08:00:02", evento: "Sync OK", detalhe: "18 registros recebidos" },
];
export const alertas = [
  { id: "al1", nivel: "alto" as const, funcionario: "Beatriz Mendes", motivo: "GPS fora da área (3.2 km) + dispositivo não autorizado", quando: "há 2h" },
  { id: "al2", nivel: "medio" as const, funcionario: "Diego Rocha", motivo: "Foto divergente do cadastro biométrico (78% similaridade)", quando: "há 5h" },
  { id: "al3", nivel: "baixo" as const, funcionario: "Carlos Lima", motivo: "Marcação 2min antes do horário planejado", quando: "ontem" },
];
export const auditoria = [
  { id: "au1", quando: "2026-06-19 14:22", usuario: "rh@pilar.com", acao: "Ajuste aprovado", entidade: "Ponto Ana Souza 18/06", antes: "08:00→18:00", depois: "08:00→18:15" },
  { id: "au2", quando: "2026-06-19 11:05", usuario: "gestor@pilar.com", acao: "Escala alterada", entidade: "Funcionário Carlos Lima", antes: "5x2", depois: "12x36 Diurno" },
  { id: "au3", quando: "2026-06-18 17:40", usuario: "sistema", acao: "Importação Control iD", entidade: "iDClass Matriz", antes: "—", depois: "42 batidas" },
];
export const pendencias = [
  { tipo: "Ajustes a aprovar", qtd: 7 },
  { tipo: "Espelhos sem assinatura", qtd: 12 },
  { tipo: "Faltas sem justificativa", qtd: 4 },
  { tipo: "Equipamentos offline", qtd: 1 },
];
