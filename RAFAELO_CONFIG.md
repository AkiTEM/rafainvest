# Configuração do Rafaelo (Agente IA)

## Variável de Ambiente Necessária

Para que o consultor financeiro Rafaelo funcione corretamente, você precisa configurar a chave da API do Perplexity no Netlify.

### Como Configurar (Plano Gratuito)

1. Acesse o dashboard do seu site no Netlify
2. Vá em **Site settings**
3. Clique em **Environment variables** no menu lateral
4. Clique em **Add a variable**
5. Configure:
   - **Key**: `PERPLEXITY_API_KEY`
   - **Value**: Cole aqui a chave da API do Perplexity (veja no arquivo `.env.local`)
   - **Scopes**: Marque **All scopes** (Deploy, Functions, Deploy Previews)
6. Clique em **Create variable**
7. Faça um novo deploy do site

### Desenvolvimento Local

Se quiser testar localmente com Netlify CLI:

```bash
# Instale o Netlify CLI (se ainda não tiver)
npm install -g netlify-cli

# Execute o servidor local
netlify dev
```

O arquivo `.env.local` já está configurado para desenvolvimento local e não será commitado no Git.

### Arquitetura

- **Cliente** (`public/agente.js`): Interface do chat, sem chaves expostas
- **Servidor** (`netlify/functions/agent.js`): Faz a chamada à API do Perplexity de forma segura
- **Variável de Ambiente**: Chave da API armazenada com segurança no Netlify

### Teste

Após configurar, abra o site e clique em "Fale com o Rafaelo" para testar o consultor financeiro IA.
