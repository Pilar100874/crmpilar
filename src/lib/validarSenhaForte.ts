/**
 * Valida se a senha atende aos requisitos de segurança do login.
 * Retorna a mensagem de erro em português ou null quando a senha é válida.
 */
const SENHAS_COMUNS = [
  "123456",
  "1234567",
  "12345678",
  "123456789",
  "1234567890",
  "senha",
  "senha123",
  "password",
  "password1",
  "qwerty",
  "abc123",
  "111111",
  "000000",
  "admin",
  "admin123",
  "iloveyou",
  "pilar123",
];

export function validarSenhaForte(senha: string): string | null {
  if (senha.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Za-z]/.test(senha)) return "A senha deve conter pelo menos uma letra.";
  if (!/[0-9]/.test(senha)) return "A senha deve conter pelo menos um número.";
  if (!/[^A-Za-z0-9]/.test(senha))
    return "A senha deve conter pelo menos um símbolo (ex.: @ # ! $).";
  if (SENHAS_COMUNS.includes(senha.toLowerCase()))
    return "Essa senha é muito comum e está em listas de senhas vazadas. Escolha outra.";
  return null;
}
