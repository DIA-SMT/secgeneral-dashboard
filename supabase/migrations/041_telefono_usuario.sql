-- ============================================================
-- MIGRACION 041: Telefono de contacto del usuario (24/08/2026)
-- ============================================================
-- Pedido (paginas 37-38 del documento de modificaciones):
--   "El sistema actualmente tiene en su base de datos los correos electronicos
--    de los usuarios, pero puedo generar un sheets nuevo donde esten los
--    numeros de telefono o sino pensaba que puede haber una herramienta para
--    ponerlos directamente en el sistema, aqui: [captura de /admin/usuarios]"
--
-- Va como columna del perfil y no como tabla aparte: es un dato de contacto
-- mas, igual que el email, y hay uno por persona.
--
-- Se guarda en E.164 (+549381XXXXXXX): un solo formato canonico, para que
-- cualquier proveedor de mensajeria lo tome sin tener que transformarlo. La app
-- normaliza antes de escribir (normalizarTelefono en lib/utils.ts) y este CHECK
-- es la red de seguridad: si algo escribe directo contra la base, rebota.
--
-- Nullable a proposito: los telefonos se van a cargar de a poco y un usuario
-- sin telefono tiene que poder seguir operando igual.
--
-- No hace falta tocar RLS: perfil_select_propio_o_admin y perfil_update_admin
-- son por fila, no por columna, asi que la columna nueva hereda el mismo
-- alcance que el resto del perfil (la ve el propio usuario y los admins).
--
-- Idempotente: se puede volver a correr sin efecto.
-- ============================================================

BEGIN;

ALTER TABLE public.perfil_usuario
  ADD COLUMN IF NOT EXISTS telefono text;

-- E.164: '+', un primer digito 1-9, y entre 7 y 14 digitos mas (15 como maximo
-- contando el primero). Deja pasar el NULL.
ALTER TABLE public.perfil_usuario
  DROP CONSTRAINT IF EXISTS chk_perfil_telefono;

ALTER TABLE public.perfil_usuario
  ADD CONSTRAINT chk_perfil_telefono CHECK (
    telefono IS NULL OR telefono ~ '^\+[1-9][0-9]{7,14}$'
  );

COMMENT ON COLUMN public.perfil_usuario.telefono IS
  'Telefono de contacto en formato E.164 (ej. +5493814123456). Nullable. Se carga desde /admin/usuarios y lo usa la herramienta de alertas (24.08).';

COMMIT;

-- Para revertir:
--   alter table public.perfil_usuario drop constraint if exists chk_perfil_telefono;
--   alter table public.perfil_usuario drop column if exists telefono;
