export const BOILERPLATES = {
  javascript: `/**\n * Welcome to CodeCollab!\n * Use this space to write and share code in real-time.\n */\n\nfunction main() {\n  console.log("Hello, Collaborative World!");\n}\n\nmain();\n`,
  typescript: `/**\n * Welcome to CodeCollab!\n */\n\ninterface User {\n  name: string;\n  active: boolean;\n}\n\nconst greet = (user: User): string => {\n  return \`Hello, \${user.name}!\`;\n};\n\nconsole.log(greet({ name: "Collaborator", active: true }));\n`,
  python: `# Welcome to CodeCollab!\n\ndef main():\n    print("Hello, Collaborative World!")\n\nif __name__ == "__main__":\n    main()\n`,
  java: `/**\n * Welcome to CodeCollab!\n */\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Collaborative World!");\n    }\n}\n`,
  csharp: `using System;\n\nnamespace CodeCollab;\n\npublic class Program\n{\n    public static void Main()\n    {\n        Console.WriteLine("Hello, Collaborative World!");\n    }\n}\n`,
  cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, Collaborative World!" << std::endl;\n    return 0;\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    printf("Hello, Collaborative World!\\n");\n    return 0;\n}\n`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, Collaborative World!")\n}\n`,
  rust: `fn main() {\n    println!("Hello, Collaborative World!");\n}\n`,
  html: `<!DOCTYPE html>\n<html>\n<head>\n  <title>CodeCollab Project</title>\n  <style>\n    body { background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }\n  </style>\n</head>\n<body>\n  <h1>Collaborative Preview</h1>\n</body>\n</html>\n`,
};
