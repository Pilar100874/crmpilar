/** Wrap the router navigator so Link, menus and useNavigate share one guard. */
export function instalarProtecaoNavegacao<T extends { push: (...args: any[]) => void; replace: (...args: any[]) => void; go: (...args: any[]) => void }>(
  navigator: T,
  interceptar: (continuar: () => void, destino?: unknown) => boolean,
) {
  const originais = { push: navigator.push, replace: navigator.replace, go: navigator.go };
  const metodos = ["push", "replace", "go"] as const;
  for (const metodo of metodos) {
    navigator[metodo] = (...args: any[]) => {
      const continuar = () => originais[metodo].apply(navigator, args);
      if (!interceptar(continuar, metodo === "go" ? undefined : args[0])) continuar();
    };
  }
  return () => {
    for (const metodo of metodos) navigator[metodo] = originais[metodo];
  };
}