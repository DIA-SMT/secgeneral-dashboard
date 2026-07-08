-- 020: Limpia los "ceros contra objetivo" de indicador (continuación de 019).
--
-- Contexto: además de los ceros sin objetivo (migración 019), quedaban 132
-- indicadores con valor_actual = 0 contra un objetivo definido (ej. "0 / 4").
-- Nacieron del mismo bug del formulario (se cargaba solo el objetivo y el
-- "Valor actual" vacío se guardaba como 0). Se confirmó con el área que
-- representan "sin avance cargado", no un 0 reportado.
--
-- Sólo se anula el valor_actual espurio. Se PRESERVAN el objetivo y la
-- observación (las 3 filas con nota son de planificación, no reportes de 0).
--
-- Reversible: respalda las filas afectadas en _backup_indicador_cero_objetivo.

begin;

create table if not exists _backup_indicador_cero_objetivo as
select
  id,
  valor_actual,
  valor_objetivo,
  valor_actual_texto,
  estado_semaforo,
  ultima_actualizacion,
  now() as respaldado_en
from indicador
where deleted_at is null
  and valor_actual = 0
  and valor_objetivo is not null;

update indicador
set valor_actual   = null,
    estado_semaforo = 'sin_datos'
where deleted_at is null
  and valor_actual = 0
  and valor_objetivo is not null;

commit;

-- Para revertir:
--   update indicador i
--   set valor_actual = b.valor_actual, estado_semaforo = b.estado_semaforo
--   from _backup_indicador_cero_objetivo b
--   where i.id = b.id;
