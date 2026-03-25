export const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', icon: '', monacoId: 'javascript' },
  { id: 'typescript', label: 'TypeScript', icon: '', monacoId: 'typescript' },
  { id: 'python', label: 'Python', icon: '', monacoId: 'python' },
  { id: 'java', label: 'Java', icon: '', monacoId: 'java' },
  { id: 'csharp', label: 'C#', icon: '', monacoId: 'csharp' },
  { id: 'cpp', label: 'C++', icon: '', monacoId: 'cpp' },
  { id: 'c', label: 'C', icon: '', monacoId: 'c' },
  { id: 'go', label: 'Go', icon: '', monacoId: 'go' },
  { id: 'rust', label: 'Rust', icon: '', monacoId: 'rust' },
  { id: 'ruby', label: 'Ruby', icon: '', monacoId: 'ruby' },
  { id: 'php', label: 'PHP', icon: '', monacoId: 'php' },
  { id: 'swift', label: 'Swift', icon: '', monacoId: 'swift' },
  { id: 'kotlin', label: 'Kotlin', icon: '', monacoId: 'kotlin' },
  { id: 'scala', label: 'Scala', icon: '', monacoId: 'scala' },
  { id: 'r', label: 'R', icon: '', monacoId: 'r' },
  { id: 'dart', label: 'Dart', icon: '', monacoId: 'dart' },
  { id: 'html', label: 'HTML/CSS', icon: '', monacoId: 'html' },
  { id: 'sql', label: 'SQL', icon: '', monacoId: 'sql' },
  { id: 'shell', label: 'Bash', icon: '', monacoId: 'shell' },
  { id: 'yaml', label: 'JSON/YAML', icon: '', monacoId: 'yaml' },
];

export const getLang = (id) => LANGUAGES.find(l => l.id === id) || LANGUAGES[0];

export const getMonacoLang = (id) => getLang(id).monacoId;

export const getLangLabel = (id) => getLang(id).label;
