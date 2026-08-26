-- ============================================================
-- MIGRACION 042: el Director carga POA en su secretaria (26/08/2026)
-- ============================================================
-- Pedido de la pagina 38: "crear la posibilidad de cargar proyectos
-- directamente en la secretaria de Innovacion Tecnologica".
--
-- Diagnostico previo: la Secretaria ya existe y su Secretario YA podia cargar
-- ahi. El que no podia era el Director: hasta ahora un director cargaba
-- unicamente sobre su propia direccion.
--
-- Decision (26.08): se amplia el permiso del director a la cadena de unidades
-- POR ENCIMA de la suya (su subsecretaria si tiene, y su secretaria). No a las
-- direcciones hermanas: sigue sin poder tocar el POA de un par.
--
-- Alcance real hoy: solo Ambiente (19) y Contaduria (9) tienen proyectos a
-- nivel secretaria, y ninguna de las dos tiene directores debajo. Asi que
-- ningun director gana acceso a ningun proyecto que ya exista; lo que gana es
-- poder crear.
--
-- LA AGENDA QUEDA AFUERA a proposito. `usuario_puede_cargar_unidad` la usan 10
-- policies, dos de ellas de agenda semanal. Ampliar la funcion sin mas le
-- habria dado a los 53 directores permiso de escritura sobre la agenda de su
-- secretario, que no es lo que se pidio. Para eso se separa la regla de agenda
-- en su propia funcion, que conserva el criterio anterior.
--
-- Reparto que queda:
--   usuario_puede_cargar_unidad          -> POA (proyecto, meta, indicador,
--                                           historial, avance). Director:
--                                           su unidad + ancestros.
--   usuario_puede_gestionar_agenda_unidad -> agenda semanal. Director: solo su
--                                           propia unidad, como antes.
--
-- Idempotente: se puede volver a correr sin efecto.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) POA: al director se le suman los ancestros de su unidad.
--    `unidades_ancestras` devuelve los ancestros ESTRICTOS (no incluye la
--    unidad propia), por eso el OR con p.unidad_id = p_unidad_id se mantiene.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.usuario_puede_cargar_unidad(p_unidad_id uuid)
  RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfil_usuario p
    WHERE p.user_id = auth.uid()
      AND p.activo = true
      AND (
        p.rol = 'admin_funcional'
        OR (
          p.rol = 'director'
          AND (
            p.unidad_id = p_unidad_id
            OR p_unidad_id IN (SELECT id FROM public.unidades_ancestras(p.unidad_id))
          )
        )
        OR (
          p.rol IN ('secretario', 'subsecretario', 'coordinador')
          AND p_unidad_id IN (SELECT id FROM public.unidades_descendientes(p.unidad_id))
        )
      )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.usuario_puede_cargar_unidad(uuid) IS
  'Puede cargar POA (proyectos, metas, indicadores, avances) sobre la unidad. Director: su unidad + ancestros (26.08). Secretario/Subsecretario/Coordinador: su unidad + descendientes. NO aplica a la agenda semanal: eso lo resuelve usuario_puede_gestionar_agenda_unidad.';

-- ------------------------------------------------------------
-- 1b) VISIBILIDAD: el director tambien tiene que VER lo de arriba.
--     Sin esto el permiso de carga no sirve de nada: `usuario_puede_ver_unidad`
--     resolvia solo unidad propia + descendientes, asi que un director podia
--     insertar un proyecto en su secretaria y despues no verlo. Peor: el INSERT
--     de crearProyecto lleva un RETURNING, y el RETURNING pasa por la policy de
--     SELECT, con lo cual la operacion se veia como fallada aunque la fila se
--     hubiera escrito.
--
--     Verificado antes del cambio, como ditec@smt.gob.ar (director):
--       ve_su_direccion true / ve_la_secretaria FALSE
--
--     Alcance real de esta ampliacion, medido sobre los datos de hoy: la unica
--     unidad ancestra de un director que tiene proyectos propios es Direccion de
--     Museos (8 proyectos, 10 metas, 13 indicadores), cuyos directores de
--     subdireccion pasan a verlos. Las secretarias con proyectos propios
--     (Ambiente 19, Contaduria 9) no tienen directores debajo, asi que ahi no
--     cambia nada.
--
--     Se conservan tal cual las clausulas que ya estaban, aunque la de
--     `unidades_ancestras(p_unidad_id)` y la de `unidades_descendientes(...)`
--     resuelven lo mismo: no es momento de limpiar RBAC en produccion.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.usuario_puede_ver_unidad(p_unidad_id uuid)
  RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfil_usuario p
    WHERE p.user_id = auth.uid()
      AND p.activo = true
      AND (
        p.rol IN ('intendenta', 'admin_funcional', 'admin_tecnico')
        OR p.acceso_global = true
        OR p.unidad_id = p_unidad_id
        OR p.unidad_id IN (SELECT id FROM public.unidades_ancestras(p_unidad_id))
        OR p_unidad_id IN (SELECT id FROM public.unidades_descendientes(p.unidad_id))
        -- 26.08: el director ve para arriba, porque ahora carga para arriba.
        OR (
          p.rol = 'director'
          AND p_unidad_id IN (SELECT id FROM public.unidades_ancestras(p.unidad_id))
        )
      )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ------------------------------------------------------------
-- 2) Agenda: se conserva el criterio anterior en una funcion propia.
--    Es una copia literal de la definicion de la migracion 029, para que el
--    comportamiento de la agenda no cambie en nada con esta migracion.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.usuario_puede_gestionar_agenda_unidad(p_unidad_id uuid)
  RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfil_usuario p
    WHERE p.user_id = auth.uid()
      AND p.activo = true
      AND (
        p.rol = 'admin_funcional'
        OR (p.rol = 'director' AND p.unidad_id = p_unidad_id)
        OR (
          p.rol IN ('secretario', 'subsecretario', 'coordinador')
          AND p_unidad_id IN (SELECT id FROM public.unidades_descendientes(p.unidad_id))
        )
      )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.usuario_puede_gestionar_agenda_unidad(uuid) IS
  'Puede editar la agenda semanal de la unidad. Director: SOLO su propia unidad (no la de su secretario). Era el criterio general de carga hasta la migracion 042, que amplio el del POA y dejo este igual.';

-- ------------------------------------------------------------
-- 3) Las dos policies de agenda pasan a usar la funcion propia.
--    Se recrean con la misma forma que tenian en la migracion 012.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS agenda_semana_mutate_carga ON public.agenda_semana;
CREATE POLICY agenda_semana_mutate_carga ON public.agenda_semana
  FOR ALL
  USING (public.usuario_puede_gestionar_agenda_unidad(unidad_id))
  WITH CHECK (public.usuario_puede_gestionar_agenda_unidad(unidad_id));

DROP POLICY IF EXISTS agenda_actividad_mutate_carga ON public.agenda_actividad;
CREATE POLICY agenda_actividad_mutate_carga ON public.agenda_actividad
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.agenda_semana s
    WHERE s.id = agenda_actividad.agenda_semana_id
      AND public.usuario_puede_gestionar_agenda_unidad(s.unidad_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agenda_semana s
    WHERE s.id = agenda_actividad.agenda_semana_id
      AND public.usuario_puede_gestionar_agenda_unidad(s.unidad_id)
  ));

COMMIT;

-- Para revertir:
--   ...volver a la definicion de usuario_puede_ver_unidad de la migracion 031
--   ...volver a la definicion de usuario_puede_cargar_unidad de la migracion 029
--   ...y recrear las dos policies de agenda apuntando a esa funcion:
--        drop policy if exists agenda_semana_mutate_carga on public.agenda_semana;
--        create policy agenda_semana_mutate_carga on public.agenda_semana
--          for all using (public.usuario_puede_cargar_unidad(unidad_id))
--          with check (public.usuario_puede_cargar_unidad(unidad_id));
--        (idem agenda_actividad_mutate_carga con el EXISTS de la 012)
--   ...y opcionalmente: drop function if exists public.usuario_puede_gestionar_agenda_unidad(uuid);
