import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";
import { usePermissoesUsuario } from "@/hooks/usePermissoesUsuario";
import { existeIdCatalogo, idModulo } from "@/lib/permissoes/catalogo";
import { EscopoPermissao, useContextoPermissao } from "@/components/permissoes/ContextoPermissao";

const Tabs = ({ value, defaultValue, onValueChange, children, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) => {
  const { idTela } = useContextoPermissao();
  const { podeVer, carregando, acessoTotal } = usePermissoesUsuario();
  const modulosPermitidos = React.useMemo(() => {
    if (!idTela || carregando || acessoTotal) return [];
    const valores: string[] = [];
    const visitar = (nos: React.ReactNode) => React.Children.forEach(nos, (filho) => {
      if (!React.isValidElement(filho)) return;
      const propriedades = filho.props as { value?: string; children?: React.ReactNode };
      if (typeof propriedades.value === "string") {
        const id = idModulo(idTela, propriedades.value);
        if (existeIdCatalogo(id) && podeVer(id)) valores.push(propriedades.value);
      }
      if (propriedades.children) visitar(propriedades.children);
    });
    visitar(children);
    return [...new Set(valores)];
  }, [children, idTela, carregando, acessoTotal, podeVer]);

  const valorAtual = value ?? defaultValue;
  const atualCatalogado = Boolean(idTela && valorAtual && existeIdCatalogo(idModulo(idTela, valorAtual)));
  const valorEfetivo = !acessoTotal && atualCatalogado && valorAtual && !podeVer(idModulo(idTela as string, valorAtual))
    ? modulosPermitidos[0]
    : value;

  React.useEffect(() => {
    if (valorEfetivo && valorEfetivo !== valorAtual) onValueChange?.(valorEfetivo);
  }, [valorEfetivo, valorAtual, onValueChange]);

  const moduloAtivo = idTela && (valorEfetivo ?? valorAtual)
    ? idModulo(idTela, String(valorEfetivo ?? valorAtual))
    : null;

  return (
    <EscopoPermissao idTela={idTela} idModulo={moduloAtivo && existeIdCatalogo(moduloAtivo) ? moduloAtivo : null}>
      <TabsPrimitive.Root
        value={valorEfetivo}
        defaultValue={value === undefined ? defaultValue : undefined}
        onValueChange={onValueChange}
        {...props}
      >
        {children}
      </TabsPrimitive.Root>
    </EscopoPermissao>
  );
};

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, value, ...props }, ref) => {
  const { idTela } = useContextoPermissao();
  const { podeVer, carregando } = usePermissoesUsuario();
  const id = idTela ? idModulo(idTela, value) : null;
  if (!carregando && id && existeIdCatalogo(id) && !podeVer(id)) return null;
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=inactive]:hidden",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
