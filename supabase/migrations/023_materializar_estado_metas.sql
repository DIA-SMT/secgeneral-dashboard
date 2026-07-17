-- 023: Materializa el estado_semaforo de las metas a partir de sus indicadores
-- (cascada 16.07). A partir de ahora la app recalcula el estado de la meta en
-- cada cambio de indicador (recomputarEstadoMeta en actions.ts / chat tools);
-- esta migración sincroniza los datos ya cargados.
--
-- Sólo se recalculan las metas que TIENEN indicadores. Las metas sin
-- indicadores conservan su propio estado (cargado con el avance de la meta).
--
-- El cálculo (avanceIndicador / avanceAgregado / estadoDeAvance) vive en
-- TypeScript, así que la migración se aplica con el runner
-- _tmp_apply_023.ts. Acá sólo se documenta y se respalda.
--
-- Respaldo:  _backup_meta_estado_16jul (id, estado_semaforo).
-- Revertir:  update meta m set estado_semaforo = b.estado_semaforo
--            from _backup_meta_estado_16jul b where m.id = b.id;

create table if not exists _backup_meta_estado_16jul as
select id, estado_semaforo, now() as respaldado_en
from meta
where deleted_at is null;
