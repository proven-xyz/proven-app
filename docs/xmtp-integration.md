# Integración XMTP — Paso 1 (baseline)

**Estado:** Pasos 1–7 completados — referencia viva para la integración XMTP.  
**Última revisión de docs:** índice oficial `https://docs.xmtp.org/llms.txt` (consultar de nuevo antes de codificar APIs concretas; el SDK evoluciona).

---

## 1. Paquete y repositorio upstream

| Campo | Valor |
|--------|--------|
| **Paquete npm** | `@xmtp/browser-sdk` |
| **Versión estable (npm registry, al documentar)** | `7.0.0` |
| **Descripción** | XMTP client SDK for browsers written in TypeScript |
| **Código** | [github.com/xmtp/xmtp-js](https://github.com/xmtp/xmtp-js) (árbol `sdks/browser-sdk`) |

**Nota:** Antes de `npm install`, ejecutar `npm view @xmtp/browser-sdk version` por si la versión parche ha subido. Las firmas de métodos deben contrastarse con la documentación de esa versión, no con memoria estática.

---

## 2. Tabla tema → documentación oficial (llms.txt)

Base URL: `https://docs.xmtp.org`

| Tema | Ruta (relativa) | Uso en PROVEN |
|------|-----------------|---------------|
| Browser SDK (entrada) | `/chat-apps/sdks/browser` | Instalación, quickstart, visión general browser |
| Crear signer | `/chat-apps/core-messaging/create-a-signer` | Conectar `window.ethereum` → objeto `Signer` (EOA) |
| Crear cliente | `/chat-apps/core-messaging/create-a-client` | `Client.create` / inicialización tras wallet conectada |
| Crear conversaciones | `/chat-apps/core-messaging/create-conversations` | DM 1:1 con contraparte del VS; `canMessage` si aplica |
| Enviar mensajes | `/chat-apps/core-messaging/send-messages` | Input de chat en panel VS |
| Listar conversaciones | `/chat-apps/list-stream-sync/list` | Opcional: bandeja futura |
| Listar mensajes | `/chat-apps/list-stream-sync/list-messages` | Historial del hilo activo |
| Stream | `/chat-apps/list-stream-sync/stream` | Mensajes / conversaciones en tiempo real |
| Sync / SyncAll | `/chat-apps/list-stream-sync/sync-and-syncall` | Al abrir panel o volver a la pestaña |
| History sync | `/chat-apps/list-stream-sync/history-sync` | Opcional (multi-dispositivo) |
| Consentimiento (concepto) | `/chat-apps/user-consent/user-consent` | Entender spam / preferencias |
| Consentimiento (implementar) | `/chat-apps/user-consent/support-user-consent` | Métodos de consent en UI |
| Límites de ratio | `/chat-apps/core-messaging/rate-limits` | Errores y backoff en producción |
| Firmas (usuario) | `/protocol/signatures` | Qué firmas pedirá la wallet |
| Identidad / inboxes | `/chat-apps/core-messaging/manage-inboxes` | Inbox ID, instalaciones (debug avanzado) |
| Wallet signatures (payloads) | `/chat-apps/use-signatures` | Firmar / verificar payloads si se amplía |

**Páginas útiles pero no bloqueantes para MVP**

- `/chat-apps/content-types/content-types` — tipos de contenido (texto primero).
- `/chat-apps/debug/debug-your-app` — depuración.
- `/fund-agents-apps/*` — Gateway / fees; relevar solo si se exige en testnet/mainnet según roadmap XMTP.

---

## 3. Inventario del proyecto PROVEN

### 3.1 Wallet (punto de integración del signer)

| Archivo | Rol |
|---------|-----|
| [`app/layout.tsx`](../app/layout.tsx) | `WalletProvider` envuelve `{children}` + Toaster; **todo el árbol de la app** tiene acceso al contexto wallet. |
| [`lib/wallet.tsx`](../lib/wallet.tsx) | Contexto: `address`, `isConnected`, `connect`, `disconnect`, `error`; usa `window.ethereum`, `eth_requestAccounts`, `ensureGenlayerWalletChain` (GenLayer). |

**Implicación XMTP:** El `Signer` EOA debe usar el **mismo proveedor EIP-1193** y dirección que ya expone `useWallet()`. La firma para XMTP (p. ej. `personal_sign` según doc del signer) se implementará en un módulo dedicado bajo `lib/xmtp/`, importado solo desde componentes cliente.

### 3.2 Framework y límites

- **Next.js 14** App Router: el SDK **no** debe importarse en Server Components.
- **i18n:** `next-intl` en [`app/[locale]/layout.tsx`](../app/[locale]/layout.tsx); cadenas de chat en `messages/en.json` y `messages/es.json`.

### 3.3 Estructura de carpetas (XMTP)

```
lib/xmtp/
  config.ts               # env público, feature flag, opciones para Client.create
  signer.ts               # Signer EOA + personal_sign (solo cliente)
  XmtpProvider.tsx        # contexto React: Client.create / close / estados
  vs-chat-eligibility.ts  # reglas 1v1 aceptado + resolución de peer (sin SDK)
  optimistic-send.ts      # fusión mensajes + envíos optimistas (Paso 7)
  index.ts                # barrel seguro: solo reexporta config
components/xmtp/
  VsXmtpPanel.tsx         # panel DM + mensajes + stream + optimistic send (Pasos 5–7)
  MessagesHub.tsx         # hub `/messages`: lista VS con chat XMTP vs duelos sin chat aún
```

Importar **`XmtpProvider` y `useXmtp`** desde `@/lib/xmtp/XmtpProvider` (no desde `index.ts`, para no mezclar con imports server de config si en el futuro el barrel creciera).

---

## 4. Decisiones de producto (MVP acordadas para la integración)

Estas decisiones desbloquean implementación sin ambigüedad; se pueden revisar después.

| Pregunta | Decisión |
|----------|----------|
| ¿Dónde vive el chat en MVP? | **Panel en la página de detalle del VS** [`/vs/[id]`](../app/[locale]/vs/[id]/page.tsx) (no bandeja global en header en el primer entregable). |
| ¿Quién puede usar el chat? | Usuario con **wallet conectada** y dirección igual a **`creator` u `opponent`** del VS. |
| ¿En qué estado del VS? | Solo si el VS está en estado **`accepted`** (hay oponente fijo distinto de `ZERO_ADDRESS`). *Opcional posterior:* relajar reglas con cuidado de spam/consent. |
| ¿VS de demostración (ids negativos / `SAMPLE_VS`)? | **No** iniciar conversaciones XMTP; mostrar mensaje i18n tipo “disponible en VS reales” o ocultar el panel. |
| ¿DM vs grupo? | **DM 1:1** entre las dos direcciones del VS (alineado con el modelo creador–oponente). |
| Feature flag | Recomendado: variable `NEXT_PUBLIC_FEATURE_XMTP` para despliegues graduales (definir en Paso 2). |

---

## 5. Definition of Done — Paso 1

- [x] Índice oficial consultado (`llms.txt`) y tabla de rutas documentada (sección 2).
- [x] Versión npm de `@xmtp/browser-sdk` registrada con comando verificable (sección 1).
- [x] Inventario de wallet y layout actualizado (sección 3).
- [x] Decisiones de producto por escrito (sección 4).
- [x] Estructura de carpetas propuesta para siguientes pasos.

---

## 6. Paso 2 (completado)

| Entregable | Ubicación |
|------------|-----------|
| Dependencia npm | `@xmtp/browser-sdk` en `package.json` (semver ^7; ver versión instalada con `npm ls @xmtp/browser-sdk`) |
| Variables documentadas | [`.env.example`](../.env.example) — `NEXT_PUBLIC_XMTP_ENV`, `NEXT_PUBLIC_FEATURE_XMTP`, `NEXT_PUBLIC_XMTP_APP_VERSION` |
| Lectura tipada de opciones cliente | [`lib/xmtp/config.ts`](../lib/xmtp/config.ts) → `getXmtpClientCreateOptions()` para `Client.create(signer, { env, appVersion })` |
| Barrel | [`lib/xmtp/index.ts`](../lib/xmtp/index.ts) |

**Reglas:** No importar `@xmtp/browser-sdk` en Server Components. El SDK solo en módulos bajo `"use client"` (Pasos 3–4).

**DoD Paso 2:** [x] `npm run build` OK · [x] Sin imports del SDK en el árbol RSC (aún no se importa en app) · [x] `.env.example` + README actualizados.

## 7. Paso 3 (completado)

| Entregable | Ubicación |
|------------|-----------|
| Signer EOA + `personal_sign` | [`lib/xmtp/signer.ts`](../lib/xmtp/signer.ts) — `createXmtpSignerFromEthereum(provider, address)` |
| Errores tipados | `XmtpSignerError` (`rejected`, `invalid_address`, `invalid_signature`, `unknown`) |
| Utilidades de test / depuración | `utf8MessageToHexData`, `hexSignatureToUint8Array` (exportadas) |

**Detalles técnicos**

- Interfaz `Signer` del paquete `@xmtp/browser-sdk@7`: `type: "EOA"`, `getIdentifier`, `signMessage` → `Uint8Array`.
- Identificador: `IdentifierKind.Ethereum`, dirección en **minúsculas** (como en la doc XMTP).
- Firma: `personal_sign` con mensaje UTF-8 pasado como **hex DATA** (`0x` + bytes), firma devuelta convertida a bytes.
- El barrel [`lib/xmtp/index.ts`](../lib/xmtp/index.ts) **no** reexporta el signer para evitar cargar el SDK en Server Components que importen solo config.

**DoD Paso 3:** [x] Signer conforme a doc [Create a signer](https://docs.xmtp.org/chat-apps/core-messaging/create-a-signer) · [x] `npm run build` OK · [x] Import del signer solo documentado para cliente.

## 8. Paso 4 (completado)

| Entregable | Ubicación |
|------------|-----------|
| Contexto React + ciclo de vida | [`lib/xmtp/XmtpProvider.tsx`](../lib/xmtp/XmtpProvider.tsx) |
| Hook | `useXmtp()` → `{ client, status, error, activeAddress, featureEnabled, retry }` |
| Montaje | [`app/layout.tsx`](../app/layout.tsx): `WalletProvider` → **`XmtpProvider`** → `{children}` |

**Comportamiento**

| `status` | Significado |
|----------|-------------|
| `disabled` | `NEXT_PUBLIC_FEATURE_XMTP` no activo → no se llama a `Client.create`. |
| `idle` | Feature activo pero sin wallet conectada. |
| `initializing` | `Client.create` en curso (puede pedir firma al registrar inbox XMTP). |
| `ready` | `client` listo para `conversations`, streams, etc. |
| `error` | Fallo de init; `retry()` incrementa un trigger para reintentar. |

**Detalles técnicos**

- Signer: `createXmtpSignerFromEthereum` + opciones `getXmtpClientCreateOptions()` (`env` como `XmtpEnv`, `appVersion`).
- **Concurrencia:** `initGenRef` invalida resultados obsoletos (React Strict Mode, cambio de cuenta, desmontaje).
- **Cierre:** `client.close()` en cleanup y al desconectar ([doc “Log out”](https://docs.xmtp.org/chat-apps/core-messaging/create-a-client#log-out-a-client)).
- **Tipos TS:** `ClientOptions` es una intersección con unión; las opciones se pasan con `as Parameters<typeof Client.create>[1]` documentado en código.
- **Tipo de instancia:** `XmtpClientInstance = Awaited<ReturnType<typeof Client.create>>` para alinear `useState` / refs con el retorno real de `Client.create`.

**DoD Paso 4:** [x] Provider bajo `WalletProvider` · [x] Estados explícitos + `retry` · [x] Feature flag respetada · [x] Sin importar el provider desde Server Components.

## 9. Paso 5 (completado)

| Entregable | Ubicación |
|------------|-----------|
| Reglas de negocio 1v1 | [`lib/xmtp/vs-chat-eligibility.ts`](../lib/xmtp/vs-chat-eligibility.ts) — `canOpenVsXmtpChat`, `getVsXmtpPeerAddress` |
| UI + DM + mensajes + stream | [`components/xmtp/VsXmtpPanel.tsx`](../components/xmtp/VsXmtpPanel.tsx) |
| Integración | [`app/[locale]/vs/[id]/page.tsx`](../app/[locale]/vs/[id]/page.tsx) — solo si `!isSampleVS` |
| i18n | `messages/en.json` / `es.json` → namespace **`xmtpVs`** |

**Reglas de producto**

- Chat solo si `vs.state === "accepted"`, `opponent !== ZERO`, **`getVSChallengerCount(vs) === 1`** (no multi-challenger).
- Peer: la otra dirección si la wallet es creator u opponent (case-insensitive).
- **`NEXT_PUBLIC_FEATURE_XMTP`:** si está apagado, el panel no se renderiza (`null`).
- **VS de muestra:** no se monta el panel (`!isSampleVS`).

**Flujo técnico (SDK v7)**

1. `conversations.sync()` → `fetchDmByIdentifier` → si no existe, `Client.canMessage` → `createDmWithIdentifier`.
2. `conversation.sync()` → `messages({ limit: 40 })` ordenados por `sentAt`.
3. `conversation.stream({ onValue })` para nuevos mensajes; en cleanup `stream.end()` + invalidación por `initGen` (misma idea que el provider).

**DoD Paso 5:** [x] Panel en detalle VS · [x] Texto accesible (`aria-live`) · [x] i18n ES/EN · [x] `npm run build` OK.

## 10. Paso 6 (completado)

| Entregable | Ubicación |
|------------|-----------|
| Tipo instancia cliente | [`lib/xmtp/types.ts`](../lib/xmtp/types.ts) — `XmtpClientInstance` (usado por provider + hook) |
| Lógica de hilo (sync global, consent, mensajes, errores) | [`lib/xmtp/chat-thread.ts`](../lib/xmtp/chat-thread.ts) — `ensureVsDmThread`, `loadThreadMessages`, `classifyXmtpThreadError`, `XmtpPeerUnreachableError` |
| Hook ciclo de vida DM + stream + visibilidad | [`hooks/useVsXmtpThread.ts`](../hooks/useVsXmtpThread.ts) |
| UI | [`components/xmtp/VsXmtpPanel.tsx`](../components/xmtp/VsXmtpPanel.tsx) — delega en `useVsXmtpThread`, botón **Actualizar / Refresh** |

**Comportamiento**

- **Sync global:** `conversations.syncAll([ConsentState.Allowed])` al abrir el hilo y al refrescar manual (alineado con listas consentidas).
- **Consentimiento:** si el DM existe con `consentState === Unknown`, se llama `updateConsentState(Allowed)` antes de `conversation.sync()`.
- **Errores:** `classifyXmtpThreadError` distingue `peer_unreachable` (i18n existente), `rate_limit`, `network` y `unknown`; mensajes técnicos solo como fallback.
- **Refresco al volver a la pestaña:** `visibilitychange` (solo transición hidden → visible) con **throttle ~4 s** para no saturar la API.
- **Reintento tras error de hilo:** `retryOpenThread` (nonce) reinicia la apertura; error del **provider** XMTP sigue usando `retry()` del contexto.

**DoD Paso 6:** [x] Módulos dedicados (types + chat-thread + hook) · [x] `syncAll` + consent · [x] Clasificación errores + i18n · [x] Refresco pestaña + botón manual · [x] `npm run build` OK.

## 12. Hub de mensajes (navbar)

| Entregable | Ubicación |
|------------|-----------|
| Ruta | [`app/[locale]/messages/page.tsx`](../app/[locale]/messages/page.tsx) |
| UI | [`components/xmtp/MessagesHub.tsx`](../components/xmtp/MessagesHub.tsx) |
| Nav | [`components/Header.tsx`](../components/Header.tsx) — chip **Mensajes / Messages** a la derecha de **Mis VS**, solo si `NEXT_PUBLIC_FEATURE_XMTP` está activo |
| Ancla VS | `VS_XMTP_CHAT_ANCHOR_ID` en [`lib/xmtp/vs-chat-eligibility.ts`](../lib/xmtp/vs-chat-eligibility.ts) — envuelve `VsXmtpPanel` en `/vs/[id]` para `#proven-xmtp-vs-chat` |

**Reglas**

- **Sin duelos** (`getUserVSDirect` vacío): estado vacío con CTA a Explorar / Desafiar (no es “deshabilitado por bug”, es “no participás”).
- **Con duelos pero ningún VS elegible para XMTP** (no aceptado 1v1, multi-rival, etc.): aviso + lista “Otros duelos” con motivo i18n.
- **Chats activos**: enlaces a `/vs/[id]#proven-xmtp-vs-chat` para los VS que pasan `canOpenVsXmtpChat`.

## 14. Paso 7 (completado) — UI optimista al enviar

| Entregable | Ubicación |
|------------|-----------|
| Fusión mensajes remotos + pendientes | [`lib/xmtp/optimistic-send.ts`](../lib/xmtp/optimistic-send.ts) — `mergeThreadDisplayRows`, tipo `OptimisticPendingMessage` |
| Panel | [`components/xmtp/VsXmtpPanel.tsx`](../components/xmtp/VsXmtpPanel.tsx) — borrador se vacía al enviar, `sendText(text, true)`, dedupe por `serverMessageId` vs stream |

**Comportamiento**

- El usuario ve la burbuja al instante; el SDK envía con **`isOptimistic: true`** (capa nativa XMTP + coherencia con el stream).
- Tras `sendText`, se guarda el **ID** devuelto; cuando el hilo recibe el mismo `DecodedMessage.id`, se elimina la fila pendiente (sin duplicar).
- Fallo de envío: se quita el pendiente y se muestra el error bajo el input (como antes).

**DoD Paso 7:** [x] Sin bloquear el input hasta respuesta de red · [x] i18n estados envío · [x] `npm run build` OK.

## 15. Próximo paso

Métricas opcionales, preferencias/consent avanzado, o bandeja global fuera del VS.

**Regla de oro:** Antes de escribir código de API, repetir consulta a `llms.txt` + página concreta del tema (skill `xmtp-docs`), tal como indica [`.agents/skills/xmtp-docs/SKILL.md`](../.agents/skills/xmtp-docs/SKILL.md).

---

## 16. Variables de entorno (`.env.local`)

Todo lo necesario está documentado en [`.env.example`](../.env.example). **Copiá ese bloque XMTP** a un archivo **`.env.local`** en la raíz del repo (Next.js lo carga en desarrollo y build local; no commitear).

| Variable | Rol |
|----------|-----|
| `NEXT_PUBLIC_XMTP_ENV` | Red: `local` \| `dev` \| `production` (por defecto en código suele ser `dev`). |
| `NEXT_PUBLIC_FEATURE_XMTP` | Si no está activa (`1`, `true`, `yes`), el provider no crea cliente y el panel no muestra chat. |
| `NEXT_PUBLIC_XMTP_APP_VERSION` | Cadena tipo `proven-app/1.0.0` para telemetría del cliente XMTP. |

Valores recomendados para probar en desarrollo:

```bash
NEXT_PUBLIC_XMTP_ENV=dev
NEXT_PUBLIC_FEATURE_XMTP=1
NEXT_PUBLIC_XMTP_APP_VERSION=proven-app/0.1
```

Tras cambiar `.env.local`, **reiniciá** el servidor de desarrollo (`npm run dev`).

---

## 17. Referencias rápidas

- Docs index: <https://docs.xmtp.org/llms.txt>
- Browser SDK: <https://docs.xmtp.org/chat-apps/sdks/browser>
