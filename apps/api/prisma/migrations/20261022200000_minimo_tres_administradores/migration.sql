-- Protegemos también escrituras directas que retiren/desactiven administradores.
-- No creamos cuentas ficticias: una instalación anterior con menos de tres solo puede aumentar el número.
CREATE FUNCTION proteger_minimo_administradores() RETURNS trigger AS $$
BEGIN
  IF OLD.rol = 'ADMIN' AND OLD.activo AND
     (TG_OP = 'DELETE' OR NEW.rol <> 'ADMIN' OR NOT NEW.activo) THEN
    PERFORM pg_advisory_xact_lock(722022103);
    IF (SELECT count(*) FROM usuarios WHERE rol = 'ADMIN' AND activo) <= 3 THEN
      RAISE EXCEPTION 'Deben quedar al menos tres administradores activos' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER minimo_tres_administradores
BEFORE UPDATE OF rol, activo OR DELETE ON usuarios
FOR EACH ROW EXECUTE FUNCTION proteger_minimo_administradores();
