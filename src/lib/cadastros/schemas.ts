import { z } from "zod";
import { validateCNPJ, validateCPF, validateEmail, validatePhone, validateCEP } from "@/lib/validators";

const optionalString = z.string().trim().optional().or(z.literal(""));

export const enderecoSchema = z.object({
  cep: z.string().trim().refine((v) => !v || validateCEP(v), "CEP inválido"),
  logradouro: optionalString,
  numero: optionalString,
  complemento: optionalString,
  bairro: optionalString,
  cidade: optionalString,
  estado: optionalString,
  pais: z.string().trim().default("Brasil"),
});

export const empresaSchema = z.object({
  cnpj: z
    .string()
    .trim()
    .refine((v) => !v || validateCNPJ(v), "CNPJ inválido"),
  razao_social: z.string().trim().min(1, "Razão Social é obrigatória").max(255),
  nome_fantasia: z.string().trim().max(255).optional().or(z.literal("")),
  situacao_cadastral: optionalString,
  data_abertura: optionalString,
  natureza_juridica: optionalString,
  capital_social: z.union([z.number(), z.string(), z.null()]).optional(),
  porte: optionalString,
  regime_tributario: optionalString,
  optante_mei: z.boolean().optional().nullable(),
  optante_simples: z.boolean().optional().nullable(),
  cnae_principal: optionalString,
  cnaes_secundarios: z.array(z.object({ codigo: z.string(), descricao: z.string() })).optional(),
  email: z.string().trim().refine((v) => !v || validateEmail(v), "E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().trim().refine((v) => !v || validatePhone(v), "Telefone inválido").optional().or(z.literal("")),
  ...enderecoSchema.shape,
});

export type EmpresaFormValues = z.infer<typeof empresaSchema>;

export const pessoaFisicaSchema = z.object({
  cpf: z
    .string()
    .trim()
    .refine((v) => !v || validateCPF(v), "CPF inválido"),
  nome: z.string().trim().min(1, "Nome é obrigatório").max(255),
  data_nascimento: optionalString,
  celular: z.string().trim().refine((v) => !v || validatePhone(v), "Celular inválido").optional().or(z.literal("")),
  email: z.string().trim().refine((v) => !v || validateEmail(v), "E-mail inválido").optional().or(z.literal("")),
  ...enderecoSchema.shape,
});

export type PessoaFisicaFormValues = z.infer<typeof pessoaFisicaSchema>;
