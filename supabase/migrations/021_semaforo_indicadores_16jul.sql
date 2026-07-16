-- 021: Corrige el semáforo de los indicadores (correcciones del 16.07) y
-- revierte la migración 020.
--
-- Reglas acordadas:
--   * Cuantitativo con valor_actual = 0  → "No iniciado" (rojo), no "En
--     ejecución" ni "Sin datos". (Excepto indicadores invertidos, donde 0
--     puede ser bueno: esos no se tocan acá.)
--   * Cualitativo con valor "No"          → "No iniciado" (rojo).
--   * Sin valor cargado (solo objetivo)   → "Sin datos".
--
-- Reversible: respalda el estado_semaforo de todos los indicadores en
-- _backup_indicador_estado_16jul antes de recalcular.

begin;

-- 1) Revertir 020: restaurar el valor_actual = 0 de los 132 indicadores
--    (el 0 es un dato válido = "No iniciado", no debe quedar como Sin datos).
update indicador i
set valor_actual = b.valor_actual
from _backup_indicador_cero_objetivo b
where i.id = b.id;

-- Respaldo del estado actual (para poder revertir el recálculo).
create table if not exists _backup_indicador_estado_16jul as
select id, estado_semaforo, now() as respaldado_en
from indicador
where deleted_at is null;

-- 2) Cuantitativo con valor 0 → No iniciado (rojo). Excluye invertidos.
update indicador
set estado_semaforo = 'rojo'
where deleted_at is null
  and valor_actual = 0
  and coalesce((metadata->>'invertida')::boolean, false) = false
  and estado_semaforo <> 'rojo';

-- 3) Cualitativo con valor "No" → No iniciado (rojo).
update indicador
set estado_semaforo = 'rojo'
where deleted_at is null
  and valor_actual is null
  and lower(trim(valor_actual_texto)) = 'no'
  and estado_semaforo <> 'rojo';

-- 4) Sin valor cargado (solo objetivo o nada) → Sin datos.
update indicador
set estado_semaforo = 'sin_datos'
where deleted_at is null
  and valor_actual is null
  and (valor_actual_texto is null or trim(valor_actual_texto) = '')
  and estado_semaforo <> 'sin_datos';

commit;

-- Para revertir el recálculo de estado:
--   update indicador i set estado_semaforo = b.estado_semaforo
--   from _backup_indicador_estado_16jul b where i.id = b.id;
