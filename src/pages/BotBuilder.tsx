import { Standard } from '@typebot.io/react';
import Layout from "@/components/Layout";

export default function BotBuilder() {
  return (
    <Layout>
      <div className="h-full w-full flex flex-col">
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Bot Builder</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Construtor visual de fluxos de conversação com Typebot
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full">
          <Standard
            typebot="my-typebot"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </Layout>
  );
}
