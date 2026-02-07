# Verificação e Testes - Audio Handling

Para garantir que a implementação de áudio está funcionando corretamente, siga os passos abaixo:

## 1. Verificar Schema do Banco de Dados
Este script verifica se todas as colunas necessárias (`media_type`, `file_path_ogg`, etc.) foram criadas na tabela `chat_logs`.
```bash
node server/verify_audio_schema.js
```

## 2. Verificar Filesystem e FFmpeg
Este script testa:
- Criação de pastas em `storage/`
- Se o `FFmpeg` está instalado e acessível
- Se o servidor está servindo arquivos estáticos na porta 3001
```bash
node server/verify_files.js
```
*Certifique-se de que o servidor está rodando (`node server/index.js`) para o teste de HTTP funcionar.*

## 3. Teste Manual
1. Envie um áudio via Postman para `POST /:contactId/send-media`.
2. Verifique se o arquivo `.ogg` e `.mp3` foram criados em `server/storage/tenant_X/channel_Y/`.
3. Verifique se o log no banco tem `file_path_mp3` preenchido.
