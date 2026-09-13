import { Link } from 'react-router-dom'
import { Card } from '../../components/Card'
import { Logo } from '../../components/Logo'

const LAST_UPDATED = '13 de septiembre de 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <div className="flex flex-col gap-2 text-xs leading-relaxed text-text-2">{children}</div>
    </div>
  )
}

export function LegalPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <Link to="/login" className="inline-flex items-center gap-2">
          <Logo size={26} />
        </Link>
        <Link to="/login" className="text-xs font-medium text-accent hover:underline">
          ← Volver
        </Link>
      </div>

      <div className="rounded-md border border-warn/30 bg-warn-light px-4 py-3 text-xs text-warn">
        <strong className="font-semibold">Borrador de trabajo.</strong> Este documento describe de buena fe cómo
        funciona NutriElite hoy. No es asesoría legal y no ha sido revisado por un abogado — antes de operar con
        datos reales de pacientes, se recomienda que un profesional del derecho (idealmente familiarizado con la
        LFPDPPP mexicana y, si aplica, con normativa de salud/datos personales del país de cada usuario) lo revise
        y adapte a la operación real del negocio.
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Aviso de Privacidad y Términos de Uso</h1>
        <p className="mt-1 text-xs text-text-3">Última actualización: {LAST_UPDATED}</p>
      </div>

      <Card className="flex flex-col gap-5">
        <h2 className="font-display text-lg font-semibold text-text">Aviso de Privacidad</h2>

        <Section title="1. Responsable del tratamiento">
          <p>
            NutriElite es una plataforma que los nutricionistas usan para gestionar pacientes propios. El
            nutricionista que crea una cuenta es responsable de los datos de sus pacientes que captura en el
            sistema (los recaba, decide qué hacer con ellos y responde ante sus propios pacientes); NutriElite
            actúa como encargado del tratamiento, procesando esos datos únicamente para prestar el servicio.
          </p>
        </Section>

        <Section title="2. Datos que se recaban">
          <p><strong>De la cuenta del nutricionista/estudiante:</strong> usuario, email, contraseña (almacenada
            con hash, nunca en texto plano), rol, y datos de perfil profesional (nombre, cédula, especialidad,
            clínica, logo) usados para personalizar los reportes en PDF.</p>
          <p><strong>De cada paciente, capturados por el nutricionista:</strong> nombre, contacto, datos
            antropométricos y metabólicos, ficha clínica (antecedentes heredofamiliares, patológicos y no
            patológicos, alergias, medicamentos — alineada a la NOM-004-SSA3-2012), notas de consulta
            (metodología ABCD: antropométricos, bioquímicos, clínicos, dietéticos), evaluaciones renales KDOQI,
            citas agendadas y, si el paciente lo usa, entradas de su diario alimentario.</p>
          <p><strong>Fotos de laboratorio:</strong> si el nutricionista sube una foto de un estudio de laboratorio
            para extraer valores automáticamente, la imagen se envía a la API de Claude (Anthropic) para su
            lectura y no se almacena de forma permanente por NutriElite — solo los valores que el nutricionista
            decide guardar en la ficha del paciente.</p>
          <p><strong>Datos de pago:</strong> el procesamiento de la suscripción se realiza a través de Stripe;
            NutriElite no almacena números de tarjeta ni datos bancarios completos.</p>
        </Section>

        <Section title="3. Para qué se usan los datos">
          <p>
            Exclusivamente para operar el servicio: calcular requerimientos nutricionales, generar menús y listas
            de compra, generar el reporte clínico en PDF, agendar y recordar citas, dar seguimiento a la evolución
            del paciente, y (si el nutricionista lo activa) permitir que el propio paciente vea su plan y registre
            su diario alimentario a través de un enlace del portal. No se usan datos de pacientes con fines
            publicitarios ni se venden a terceros.
          </p>
        </Section>

        <Section title="4. Terceros que procesan datos por cuenta de NutriElite">
          <p>
            <strong>Anthropic (API de Claude):</strong> genera los menús semanales y lee fotos de laboratorio
            cuando el nutricionista usa esas funciones. <strong>Stripe:</strong> procesa pagos de la suscripción.
            <strong> Resend:</strong> envía correos transaccionales (confirmación de citas, recuperación de
            contraseña). <strong>Railway:</strong> aloja la aplicación y la base de datos. <strong>USDA FoodData
            Central:</strong> se consulta solo por nombre de alimento para obtener valores nutricionales públicos
            — no se les envía ningún dato del paciente.
          </p>
        </Section>

        <Section title="5. Derechos del titular de los datos (ARCO)">
          <p>
            El paciente cuyos datos captura un nutricionista puede solicitar acceso, rectificación, cancelación u
            oposición al tratamiento de sus datos directamente a su nutricionista, quien es responsable de
            atenderlo. El nutricionista o estudiante, sobre los datos de su propia cuenta, puede: exportar toda su
            información en un archivo descargable desde Configuración, o eliminar su cuenta de forma permanente
            (lo que borra también los datos de sus pacientes asociados) — ambas opciones están disponibles
            directamente en la aplicación, sin necesidad de solicitud manual.
          </p>
        </Section>

        <Section title="6. Seguridad y retención">
          <p>
            Las contraseñas se almacenan con hash (nunca en texto plano), el acceso a la API requiere una sesión
            autenticada, y cada nutricionista solo puede ver los datos de sus propios pacientes. Los datos se
            conservan mientras la cuenta esté activa; al eliminar la cuenta, los registros clínicos ligados a ella
            se eliminan de forma permanente e irreversible.
          </p>
        </Section>

        <Section title="7. Menores de edad">
          <p>
            NutriElite permite registrar pacientes pediátricos, pero siempre como datos capturados por el
            nutricionista tratante (o su representante legal), no directamente por el menor. El módulo de
            estudiantes usa pacientes ficticios de práctica, claramente marcados como tales.
          </p>
        </Section>

        <Section title="8. Cambios a este aviso">
          <p>
            Este aviso puede actualizarse conforme evolucione el producto. La fecha de "Última actualización" al
            inicio de esta página refleja la versión vigente.
          </p>
        </Section>
      </Card>

      <Card className="flex flex-col gap-5">
        <h2 className="font-display text-lg font-semibold text-text">Términos de Uso</h2>

        <Section title="1. Naturaleza del servicio">
          <p>
            NutriElite es una herramienta de apoyo al cálculo y seguimiento nutricional. Los resultados que genera
            (cálculo metabólico, distribución SMAE, menús generados por IA, evaluaciones renales, criba GLIM) son
            puntos de partida que requieren siempre el juicio clínico del nutricionista — no son un diagnóstico ni
            sustituyen la valoración profesional. El nutricionista es responsable de revisar y validar cualquier
            contenido, incluido el generado por inteligencia artificial, antes de compartirlo o aplicarlo con un
            paciente.
          </p>
        </Section>

        <Section title="2. Cuentas">
          <p>
            El registro está pensado para profesionales de la nutrición y estudiantes en formación. Cada persona
            es responsable de mantener la confidencialidad de su contraseña y de la actividad realizada desde su
            cuenta. Las cuentas de estudiante incluyen pacientes de práctica ficticios y no deben usarse para
            capturar datos de pacientes reales.
          </p>
        </Section>

        <Section title="3. Suscripción y pagos">
          <p>
            NutriElite ofrece un plan gratuito con funciones limitadas y un plan de pago (Pro) con acceso completo,
            incluyendo el generador de menús con IA. Los pagos se procesan a través de Stripe conforme a los
            términos vigentes al momento de la contratación; la cancelación de la suscripción puede solicitarse en
            cualquier momento desde la sección de facturación.
          </p>
        </Section>

        <Section title="4. Uso aceptable">
          <p>
            No está permitido: compartir credenciales de acceso con terceros no autorizados, intentar acceder a
            datos de pacientes de otro nutricionista, usar la plataforma para fines distintos al ejercicio
            profesional de la nutrición, o subir contenido ilegal, difamatorio o que infrinja derechos de
            terceros.
          </p>
        </Section>

        <Section title="5. Propiedad intelectual">
          <p>
            El software, la marca y el diseño de NutriElite son propiedad de sus desarrolladores. Los datos de
            pacientes y los planes que cada nutricionista genera le pertenecen a él (o a su clínica) y a su
            paciente; NutriElite no reclama derechos sobre ese contenido, más allá de lo necesario para operar el
            servicio.
          </p>
        </Section>

        <Section title="6. Limitación de responsabilidad">
          <p>
            NutriElite se ofrece "tal cual". En la medida permitida por la ley aplicable, no se garantiza que los
            cálculos, menús o evaluaciones generados estén libres de error, y no se asume responsabilidad por
            decisiones clínicas tomadas sin la revisión profesional correspondiente. El uso de las funciones de
            inteligencia artificial está sujeto a las limitaciones inherentes de esa tecnología.
          </p>
        </Section>

        <Section title="7. Terminación">
          <p>
            El usuario puede eliminar su cuenta en cualquier momento desde Configuración. NutriElite podrá
            suspender o cancelar cuentas que incumplan estos términos, con notificación previa cuando sea
            razonablemente posible.
          </p>
        </Section>

        <Section title="8. Ley aplicable">
          <p>
            Estos términos se rigen, salvo que se indique lo contrario en un acuerdo específico, por la legislación
            mexicana — este documento debe confirmarse y, de ser necesario, adaptarse jurisdicción por
            jurisdicción antes de operar comercialmente fuera de México.
          </p>
        </Section>

        <Section title="9. Modificaciones">
          <p>
            Estos términos pueden actualizarse; el uso continuado de la plataforma después de una actualización
            implica la aceptación de los términos vigentes.
          </p>
        </Section>
      </Card>

      <p className="pb-6 text-center text-[11px] text-text-3">© {new Date().getFullYear()} NutriElite</p>
    </div>
  )
}
