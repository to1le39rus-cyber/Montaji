// deploy-rules-via-rest.mjs
// Деплой firestore.rules.v2 напрямую через Firebase Rules REST API,
// без firebase-tools (у которого свой отдельный login-флоу, ломающийся на мобильном
// браузере в Cloud Shell). Использует тот же способ аутентификации, что и
// migrate-jobs.mjs — Application Default Credentials, которые Cloud Shell
// подставляет автоматически без дополнительного входа.
//
// Запуск (из папки ~/Montaji в Cloud Shell):
//   node secure-app/crm-v2/deploy-rules-via-rest.mjs

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { readFileSync } from 'fs';

const PROJECT_ID = 'montaj-39';
const RULES_PATH = new URL('./firestore.rules.v2', import.meta.url).pathname;

async function main() {
  const rulesContent = readFileSync(RULES_PATH, 'utf8');
  console.log(`Читаю правила из: ${RULES_PATH} (${rulesContent.length} байт)`);

  const app = initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });

  let token = null;
  let lastErr = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      token = (await app.options.credential.getAccessToken()).access_token;
      if (token) break;
    } catch (err) {
      lastErr = err;
      console.log(`Попытка ${attempt}/6 получить токен не удалась (обычная нестабильность metadata-сервера), пробую снова через 2с…`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  if (!token) throw lastErr || new Error('Не удалось получить токен доступа после нескольких попыток.');

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  console.log('Создаю новый ruleset…');
  const createRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source: { files: [{ name: 'firestore.rules', content: rulesContent }] },
    }),
  });
  const createData = await createRes.json();
  if (!createRes.ok) {
    console.error('Ошибка создания ruleset:', JSON.stringify(createData, null, 2));
    process.exit(1);
  }
  const rulesetName = createData.name;
  console.log(`Ruleset создан: ${rulesetName}`);

  console.log('Публикую (release) на cloud.firestore…');
  const releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore?updateMask=rulesetName`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        release: {
          name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
          rulesetName,
        },
      }),
    }
  );
  const releaseData = await releaseRes.json();
  if (!releaseRes.ok) {
    console.error('Ошибка публикации release:', JSON.stringify(releaseData, null, 2));
    process.exit(1);
  }

  console.log('✓ ГОТОВО. Новые правила опубликованы и уже действуют.');
  console.log('rulesetName:', releaseData.rulesetName);
}

main().catch(err => {
  console.error('ОШИБКА:', err);
  process.exit(1);
});
