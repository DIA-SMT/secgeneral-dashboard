-- 019: Limpia los "ceros espurios" de indicador.
--
-- Contexto: el formulario de carga guardaba valor_actual = 0 cuando el campo
-- "Valor actual" quedaba vacío (Number("") === 0). Eso marcaba indicadores sin
-- dato real como "en ejecución" (amarillo) e inflaba el Avance Global del panel.
-- El fix en los formularios evita que se generen nuevos; esta migración corrige
-- los ya cargados.
--
-- Alcance (conservador): SOLO los ceros sin objetivo, sin texto y sin
-- observación — artefactos puros, sin ninguna información. Los "0 / objetivo"
-- (un 0 reportado contra una meta, p. ej. "0 / 4 SAD") NO se tocan: pueden ser
-- un avance real y, además, no afectan el número global (rojo y sin datos pesan
-- 0 % por igual).
--
-- Reversible: respalda las filas afectadas en _backup_indicador_cero_espurio
-- antes de modificarlas.

begin;

create table if not exists _backup_indicador_cero_espurio as
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
  and valor_objetivo is null
  and (valor_actual_texto is null or valor_actual_texto = '')
  and (observacion is null or observacion = '');

update indicador
set valor_actual   = null,
    estado_semaforo = 'sin_datos'
where deleted_at is null
  and valor_actual = 0
  and valor_objetivo is null
  and (valor_actual_texto is null or valor_actual_texto = '')
  and (observacion is null or observacion = '');

commit;

-- Para revertir:
--   update indicador i
--   set valor_actual = b.valor_actual, estado_semaforo = b.estado_semaforo
--   from _backup_indicador_cero_espurio b
--   where i.id = b.id;
