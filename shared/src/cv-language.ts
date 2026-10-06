import { z } from 'zod'
import type { AutoQuestionPart, AutoQuestionText } from './auto-question'
import type { CvSection } from './cv-data'

export type CvLanguageInfo = {
  code: string
  /** Put into the prompt, never user text. */
  englishName: string
  /** Shown in the language picker. */
  nativeName: string
  /** Block headings of the preview and the PDF. */
  headings: Record<CvSection, string>
  /** What the user is asked when the draft lacks a required part (`findMissing`). */
  autoQuestions: Record<AutoQuestionPart, AutoQuestionText>
}

/**
 * The languages a CV can be written in. Limited to scripts the bundled Liberation Sans covers
 * (Latin, Cyrillic, Greek). Adding a language is one entry.
 */
export const CV_LANGUAGES = [
  {
    code: 'en',
    englishName: 'English',
    nativeName: 'English',
    headings: {
      contacts: 'Contacts',
      summary: 'Summary',
      experience: 'Experience',
      projects: 'Projects',
      education: 'Education',
      certifications: 'Certifications',
      skills: 'Skills',
      languages: 'Languages',
    },
    autoQuestions: {
      'contacts.fullName': {
        text: 'What is your full name, as it should appear on the CV?',
        label: 'Full name',
      },
      'contacts.email': {
        text: 'What email should employers use? An email or a phone number is enough.',
        label: 'Email',
      },
      'contacts.phone': {
        text: 'What phone number should employers use? An email or a phone number is enough.',
        label: 'Phone',
      },
      'summary': {
        text: 'In two or three sentences, who are you as a professional and what do you do best?',
        label: 'Summary',
      },
      'experience': {
        text: 'What did you do in your most recent job? One point per line. Add the title, company and dates in the editor. Skip this if you have no work experience yet.',
        label: 'Experience',
      },
      'experience.title': {
        text: 'What was your job title?',
        label: 'Job title',
      },
      'experience.company': {
        text: 'Which company was it?',
        label: 'Company',
      },
      'experience.period': {
        text: 'When did you work there? For example, 2019 – 2022.',
        label: 'Period',
      },
      'education.institution': {
        text: 'Which school or university was it?',
        label: 'Institution',
      },
      'skills': {
        text: 'Which skills and technologies do you use in your work? Separate them with commas.',
        label: 'Skills',
      },
    },
  },
  {
    code: 'uk',
    englishName: 'Ukrainian',
    nativeName: 'Українська',
    headings: {
      contacts: 'Контакти',
      summary: 'Профіль',
      experience: 'Досвід роботи',
      projects: 'Проєкти',
      education: 'Освіта',
      certifications: 'Сертифікати',
      skills: 'Навички',
      languages: 'Мови',
    },
    autoQuestions: {
      'contacts.fullName': {
        text: "Яке ваше повне ім'я — так, як воно має бути в резюме?",
        label: "Повне ім'я",
      },
      'contacts.email': {
        text: 'Яку електронну пошту дати роботодавцям? Достатньо пошти або телефону.',
        label: 'Ел. пошта',
      },
      'contacts.phone': {
        text: 'Який номер телефону дати роботодавцям? Достатньо пошти або телефону.',
        label: 'Телефон',
      },
      'summary': {
        text: 'Хто ви як фахівець і що вмієте найкраще? Двома-трьома реченнями.',
        label: 'Профіль',
      },
      'experience': {
        text: 'Що ви робили на останньому місці роботи? Кожен пункт з нового рядка. Посаду, компанію й дати додайте в редакторі. Пропустіть, якщо досвіду роботи ще немає.',
        label: 'Досвід роботи',
      },
      'experience.title': {
        text: 'Яка у вас була посада?',
        label: 'Посада',
      },
      'experience.company': {
        text: 'У якій компанії це було?',
        label: 'Компанія',
      },
      'experience.period': {
        text: 'Коли ви там працювали? Наприклад, 2019 – 2022.',
        label: 'Період',
      },
      'education.institution': {
        text: 'У якому навчальному закладі ви навчалися?',
        label: 'Навчальний заклад',
      },
      'skills': {
        text: 'Якими навичками й технологіями ви користуєтеся в роботі? Перелічіть через кому.',
        label: 'Навички',
      },
    },
  },
  {
    code: 'pl',
    englishName: 'Polish',
    nativeName: 'Polski',
    headings: {
      contacts: 'Kontakt',
      summary: 'Podsumowanie',
      experience: 'Doświadczenie zawodowe',
      projects: 'Projekty',
      education: 'Wykształcenie',
      certifications: 'Certyfikaty',
      skills: 'Umiejętności',
      languages: 'Języki',
    },
    autoQuestions: {
      'contacts.fullName': {
        text: 'Jak brzmi Twoje imię i nazwisko, które ma się znaleźć w CV?',
        label: 'Imię i nazwisko',
      },
      'contacts.email': {
        text: 'Jaki adres e-mail podać pracodawcom? Wystarczy e-mail albo telefon.',
        label: 'E-mail',
      },
      'contacts.phone': {
        text: 'Jaki numer telefonu podać pracodawcom? Wystarczy e-mail albo telefon.',
        label: 'Telefon',
      },
      'summary': {
        text: 'Kim jesteś zawodowo i co robisz najlepiej? W dwóch–trzech zdaniach.',
        label: 'Podsumowanie',
      },
      'experience': {
        text: 'Jakie były Twoje obowiązki w ostatniej pracy? Każdy punkt w nowej linii. Stanowisko, firmę i daty dodaj w edytorze. Pomiń, jeśli nie masz jeszcze doświadczenia zawodowego.',
        label: 'Doświadczenie zawodowe',
      },
      'experience.title': {
        text: 'Jakie było Twoje stanowisko?',
        label: 'Stanowisko',
      },
      'experience.company': {
        text: 'W jakiej firmie to było?',
        label: 'Firma',
      },
      'experience.period': {
        text: 'W jakim okresie to było? Na przykład 2019 – 2022.',
        label: 'Okres',
      },
      'education.institution': {
        text: 'Jaka to była uczelnia lub szkoła?',
        label: 'Uczelnia',
      },
      'skills': {
        text: 'Jakich umiejętności i technologii używasz w pracy? Wypisz je po przecinku.',
        label: 'Umiejętności',
      },
    },
  },
  {
    code: 'de',
    englishName: 'German',
    nativeName: 'Deutsch',
    headings: {
      contacts: 'Kontakt',
      summary: 'Profil',
      experience: 'Berufserfahrung',
      projects: 'Projekte',
      education: 'Ausbildung',
      certifications: 'Zertifikate',
      skills: 'Kenntnisse',
      languages: 'Sprachen',
    },
    autoQuestions: {
      'contacts.fullName': {
        text: 'Wie lautet Ihr vollständiger Name, so wie er im Lebenslauf stehen soll?',
        label: 'Vollständiger Name',
      },
      'contacts.email': {
        text: 'Unter welcher E-Mail-Adresse sind Sie für Arbeitgeber erreichbar? E-Mail oder Telefon genügt.',
        label: 'E-Mail',
      },
      'contacts.phone': {
        text: 'Unter welcher Telefonnummer sind Sie für Arbeitgeber erreichbar? E-Mail oder Telefon genügt.',
        label: 'Telefon',
      },
      'summary': {
        text: 'Wer sind Sie beruflich, und was können Sie am besten? In zwei bis drei Sätzen.',
        label: 'Profil',
      },
      'experience': {
        text: 'Was haben Sie in Ihrer letzten Stelle gemacht? Ein Punkt pro Zeile. Position, Unternehmen und Zeitraum tragen Sie im Editor ein. Überspringen Sie die Frage, wenn Sie noch keine Berufserfahrung haben.',
        label: 'Berufserfahrung',
      },
      'experience.title': {
        text: 'Welche Position hatten Sie?',
        label: 'Position',
      },
      'experience.company': {
        text: 'In welchem Unternehmen war das?',
        label: 'Unternehmen',
      },
      'experience.period': {
        text: 'Wann haben Sie dort gearbeitet? Zum Beispiel 2019 – 2022.',
        label: 'Zeitraum',
      },
      'education.institution': {
        text: 'An welcher Hochschule oder Schule war das?',
        label: 'Bildungseinrichtung',
      },
      'skills': {
        text: 'Welche Kenntnisse und Technologien nutzen Sie in Ihrer Arbeit? Bitte durch Kommas trennen.',
        label: 'Kenntnisse',
      },
    },
  },
  {
    code: 'fr',
    englishName: 'French',
    nativeName: 'Français',
    headings: {
      contacts: 'Coordonnées',
      summary: 'Profil',
      experience: 'Expérience professionnelle',
      projects: 'Projets',
      education: 'Formation',
      certifications: 'Certifications',
      skills: 'Compétences',
      languages: 'Langues',
    },
    autoQuestions: {
      'contacts.fullName': {
        text: "Quel est votre nom complet, tel qu'il doit figurer sur le CV ?",
        label: 'Nom complet',
      },
      'contacts.email': {
        text: 'Quelle adresse e-mail donner aux employeurs ? Un e-mail ou un téléphone suffit.',
        label: 'E-mail',
      },
      'contacts.phone': {
        text: 'Quel numéro de téléphone donner aux employeurs ? Un e-mail ou un téléphone suffit.',
        label: 'Téléphone',
      },
      'summary': {
        text: 'Qui êtes-vous sur le plan professionnel, et que faites-vous le mieux ? En deux ou trois phrases.',
        label: 'Profil',
      },
      'experience': {
        text: "Qu'avez-vous fait dans votre dernier poste ? Un point par ligne. Ajoutez l'intitulé, l'entreprise et les dates dans l'éditeur. Passez cette question si vous n'avez pas encore d'expérience professionnelle.",
        label: 'Expérience professionnelle',
      },
      'experience.title': {
        text: 'Quel était votre poste ?',
        label: 'Poste',
      },
      'experience.company': {
        text: 'Dans quelle entreprise était-ce ?',
        label: 'Entreprise',
      },
      'experience.period': {
        text: 'Quand y avez-vous travaillé ? Par exemple 2019 – 2022.',
        label: 'Période',
      },
      'education.institution': {
        text: 'Dans quel établissement était-ce ?',
        label: 'Établissement',
      },
      'skills': {
        text: 'Quelles compétences et technologies utilisez-vous dans votre travail ? Séparez-les par des virgules.',
        label: 'Compétences',
      },
    },
  },
  {
    code: 'es',
    englishName: 'Spanish',
    nativeName: 'Español',
    headings: {
      contacts: 'Contacto',
      summary: 'Perfil',
      experience: 'Experiencia profesional',
      projects: 'Proyectos',
      education: 'Formación',
      certifications: 'Certificaciones',
      skills: 'Habilidades',
      languages: 'Idiomas',
    },
    autoQuestions: {
      'contacts.fullName': {
        text: '¿Cuál es tu nombre completo, tal como debe aparecer en el CV?',
        label: 'Nombre completo',
      },
      'contacts.email': {
        text: '¿Qué correo electrónico pueden usar las empresas para contactarte? Basta con un correo o un teléfono.',
        label: 'Correo electrónico',
      },
      'contacts.phone': {
        text: '¿Qué número de teléfono pueden usar las empresas para contactarte? Basta con un correo o un teléfono.',
        label: 'Teléfono',
      },
      'summary': {
        text: '¿Quién eres como profesional y qué haces mejor? En dos o tres frases.',
        label: 'Perfil',
      },
      'experience': {
        text: '¿Qué hacías en tu último empleo? Un punto por línea. Añade el puesto, la empresa y las fechas en el editor. Omite la pregunta si aún no tienes experiencia laboral.',
        label: 'Experiencia profesional',
      },
      'experience.title': {
        text: '¿Cuál era tu puesto?',
        label: 'Puesto',
      },
      'experience.company': {
        text: '¿En qué empresa trabajabas?',
        label: 'Empresa',
      },
      'experience.period': {
        text: '¿Cuándo trabajaste allí? Por ejemplo, 2019 – 2022.',
        label: 'Periodo',
      },
      'education.institution': {
        text: '¿Dónde estudiaste?',
        label: 'Centro de estudios',
      },
      'skills': {
        text: '¿Qué habilidades y tecnologías usas en tu trabajo? Sepáralas con comas.',
        label: 'Habilidades',
      },
    },
  },
] as const satisfies readonly CvLanguageInfo[]

export type CvLanguage = (typeof CV_LANGUAGES)[number]['code']

export const CV_LANGUAGE_CODES = CV_LANGUAGES.map((language) => language.code) as [CvLanguage, ...CvLanguage[]]

export const DEFAULT_CV_LANGUAGE: CvLanguage = 'en'

export const cvLanguageSchema = z.enum(CV_LANGUAGE_CODES)

export const getCvLanguage = (code: CvLanguage): CvLanguageInfo => {
  const language = CV_LANGUAGES.find((entry) => entry.code === code)
  if (!language) throw new Error(`Unknown CV language: ${code}`)
  return language
}
