const fs = require('fs');
const path = require('path');
const http = require('http');
const fileManager = require('./utils/fileManager');

async function runTests() {
    console.log('🧪 Iniciando Verificação de Arquivos e Servidor...');

    // 1. Testar Criação de Diretório
    try {
        const tenantId = 999;
        const channelId = 888;
        const dir = fileManager.getStoragePath(tenantId, channelId);

        if (fs.existsSync(dir)) {
            console.log(`✅ Diretório criado com sucesso: ${dir}`);
        } else {
            console.error(`❌ Falha ao criar diretório: ${dir}`);
        }

        // 2. Criar Arquivo de Teste para Servidor Estático
        const testFile = path.join(dir, 'test_server.txt');
        fs.writeFileSync(testFile, 'Servidor de Arquivos Funcionando!');
        console.log(`📝 Arquivo de teste criado: ${testFile}`);

        // 3. Testar Acesso via HTTP (Servidor Estático)
        // URL esperada: http://localhost:3001/files/tenant_999/channel_888/test_server.txt
        const url = `http://localhost:3001/files/tenant_${tenantId}/channel_${channelId}/test_server.txt`;

        console.log(`🌐 Testando acesso via URL: ${url}`);

        http.get(url, (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Servidor de Estático: SUCESSO! Arquivo acessível via HTTP.');
            } else {
                console.error(`❌ Servidor de Estático: FALHA. Status Code: ${res.statusCode}`);
            }
        }).on('error', (e) => {
            console.error(`❌ Erro na requisição HTTP: ${e.message}`);
            console.log('⚠️ O servidor pode não estar rodando ou a porta 3001 está fechada.');
        });

    } catch (err) {
        console.error('Erro geral nos testes:', err);
        fs.appendFileSync(path.join(__dirname, 'files_verify_result.txt'), `Erro Geral: ${err.message}\n`);
    }

    // 4. Testar FFmpeg (Apenas verificar se binário é encontrado)
    try {
        const ffmpeg = require('fluent-ffmpeg');
        const ffmpegPath = require('ffmpeg-static');
        ffmpeg.setFfmpegPath(ffmpegPath); // Ensure path is set

        ffmpeg.getAvailableFormats((err, formats) => {
            if (err) {
                const msg = `❌ FFmpeg: Erro ao listar formatos: ${err.message}\n`;
                console.error(msg);
                fs.appendFileSync(path.join(__dirname, 'files_verify_result.txt'), msg);
            } else {
                const msg = '✅ FFmpeg: Binário encontrado e funcionando! Formatos listados.\n';
                console.log(msg);
                fs.appendFileSync(path.join(__dirname, 'files_verify_result.txt'), msg);
            }
        });
    } catch (err) {
        console.error('❌ Erro ao carregar fluent-ffmpeg:', err);
        fs.appendFileSync(path.join(__dirname, 'files_verify_result.txt'), `Erro FFmpeg Load: ${err.message}\n`);
    }
}

// Ensure correct paths
runTests();
