-- 022: Continuación de 021 — normaliza los valores de TEXTO de indicador.
--
-- Casos detectados en los datos importados:
--   * valor_actual_texto = "0" / "0%" (un cero cargado como texto) → debe ser
--     "No iniciado" (rojo).
--   * valor_actual_texto = placeholder ("-", "—", "N/A", "s/d", ".") → no es un
--     valor real: se limpia a null y queda "Sin datos".
--
-- (Los textos "No" ya se resolvieron en 021.)
-- Reversible: 021 ya respaldó el estado en _backup_indicador_estado_16jul; acá
-- se respalda además el texto en _backup_indicador_texto_16jul.

begin;

create table if not exists _backup_indicador_texto_16jul as
select id, valor_actual_texto, estado_semaforo, now() as respaldado_en
from indicador
where deleted_at is null
  and valor_actual is null
  and valor_actual_texto is not null
  and (
    regexp_replace(lower(trim(valor_actual_texto)), '[%[:space:]]', '', 'g') ~ '^0+([.,]0+)?$'
    or lower(trim(valor_actual_texto)) ~ '^(-+|—+|–+|n/?a|s/?d|\.)$'
  );

-- 1) Texto "0" / "0%" → No iniciado (rojo).
update indicador
set estado_semaforo = 'rojo'
where deleted_at is null
  and valor_actual is null
  and valor_actual_texto is not null
  and regexp_replace(lower(trim(valor_actual_texto)), '[%[:space:]]', '', 'g') ~ '^0+([.,]0+)?$'
  and estado_semaforo <> 'rojo';

-- 2) Placeholders → sin valor + Sin datos.
update indicador
set valor_actual_texto = null,
    estado_semaforo = 'sin_datos'
where deleted_at is null
  and valor_actual is null
  and lower(trim(valor_actual_texto)) ~ '^(-+|—+|–+|n/?a|s/?d|\.)$';

commit;

-- Para revertir:
--   update indicador i
--   set valor_actual_texto = b.valor_actual_texto, estado_semaforo = b.estado_semaforo
--   from _backup_indicador_texto_16jul b where i.id = b.id;
