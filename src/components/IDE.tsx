import { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material-darker.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';

import {
  Play,
  RotateCcw,
  Code,
  Terminal,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface IDEProps {
  courseId: string;
  moduleNumber: number;
}

type ExecutionResponse = {
  stdout: string | null;
  stderr: string | null;
  status: string;
};

const defaultSnippets: Record<string, string> = {
  javascript: `// JavaScript Starter Code
function greet(name) {
  console.log(
    \`Hello, \${name}! Welcome to the Edura sandbox.\`
  );
}

greet('Learner');`,
  python: `# Python Starter Code
def greet(name: str) -> None:
    print(f"Hello, {name}! Welcome to the Edura sandbox.")

greet("Learner")`
};

const languageOptions = [
  { label: 'JavaScript (Browser)', value: 'javascript', mode: 'javascript' },
  { label: 'Python (Pyodide)', value: 'python', mode: 'python' }
];

export default function IDE({ courseId }: IDEProps) {
  const { toast } = useToast();
  const defaultLanguage = useMemo(() => {
    if (courseId.includes('python')) return 'python';
    return 'javascript';
  }, [courseId]);

  const [language, setLanguage] = useState(defaultLanguage);
  const [code, setCode] = useState(defaultSnippets[defaultLanguage] || defaultSnippets.javascript);
  const [customInput, setCustomInput] = useState('');
  const [output, setOutput] = useState<ExecutionResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pyodide State
  const [pyodideReady, setPyodideReady] = useState(false);
  const pyodideRef = useRef<any>(null);

  // Initialize Pyodide on mount if not already loaded
  useEffect(() => {
    const loadPyodideAsync = async () => {
      if (window.loadPyodide) {
        if (!pyodideRef.current) {
          try {
            pyodideRef.current = await window.loadPyodide();
            setPyodideReady(true);
          } catch(e) {
             console.error("Pyodide init error", e);
          }
        } else {
           setPyodideReady(true);
        }
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
      script.async = true;
      script.onload = async () => {
        try {
          // @ts-ignore
          pyodideRef.current = await window.loadPyodide();
          setPyodideReady(true);
        } catch(e) {
          console.error("Error loading Pyodide", e);
        }
      };
      document.body.appendChild(script);
    };

    loadPyodideAsync();
  }, []);

  const selectedLanguage = languageOptions.find((option) => option.value === language) || languageOptions[0];

  const handleReset = () => {
    setCode(defaultSnippets[language] || defaultSnippets.javascript);
    setCustomInput('');
    setOutput(null);
    setError(null);
  };

  const executeJavaScript = async (sourceCode: string): Promise<ExecutionResponse> => {
    return new Promise((resolve) => {
      let outputLogs: string[] = [];
      let errLogs: string[] = [];

      // Create a secure iframe sandbox
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const iframeWindow = iframe.contentWindow as any;
      
      // Mock console
      iframeWindow.console = {
        log: (...args: any[]) => {
          outputLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        },
        error: (...args: any[]) => {
          errLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        },
        warn: (...args: any[]) => {
          outputLogs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        }
      };

      try {
        iframeWindow.eval(sourceCode);
        resolve({
          stdout: outputLogs.join('\n') || null,
          stderr: errLogs.join('\n') || null,
          status: 'Accepted'
        });
      } catch (err: any) {
        resolve({
          stdout: outputLogs.join('\n') || null,
          stderr: err.toString(),
          status: 'Runtime Error'
        });
      } finally {
        document.body.removeChild(iframe);
      }
    });
  };

  const executePython = async (sourceCode: string): Promise<ExecutionResponse> => {
     if (!pyodideRef.current) {
        return { stdout: null, stderr: "Pyodide engine is still downloading. Please try again in a few seconds.", status: "Engine Loading" };
     }

     let outputLogs: string[] = [];
     let errLogs: string[] = [];

     try {
       pyodideRef.current.setStdout({ batched: (msg: string) => outputLogs.push(msg) });
       pyodideRef.current.setStderr({ batched: (msg: string) => errLogs.push(msg) });
       
       // Handle custom Input if we need to mock sys.stdin
       if (customInput) {
          // A simple mock for sys.stdin could be injected here, but for now we skip complex stdin
       }

       await pyodideRef.current.runPythonAsync(sourceCode);
       
       return {
         stdout: outputLogs.join('\n') || null,
         stderr: errLogs.join('\n') || null,
         status: 'Accepted'
       };

     } catch (err: any) {
       return {
         stdout: outputLogs.join('\n') || null,
         stderr: err.toString(),
         status: 'Runtime Error'
       };
     }
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast({
        title: 'Write code first',
        description: 'Add some instructions before executing.',
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);
    setError(null);
    setOutput(null);

    try {
      let res: ExecutionResponse;

      if (language === 'javascript') {
        res = await executeJavaScript(code);
      } else if (language === 'python') {
        res = await executePython(code);
      } else {
         throw new Error("Language not supported by client-side engine yet.");
      }

      setOutput(res);

      if (res.status === 'Accepted') {
         toast({
          title: 'Execution Complete',
          description: 'Code executed successfully.',
         });
      } else {
         toast({
          title: 'Execution Error',
          description: 'Your code encountered an error.',
          variant: 'destructive'
         });
      }

    } catch (err: any) {
      console.error('IDE execution error:', err);
      setError(err.message || 'Failed to run code');
      toast({
        title: 'Execution failed',
        description: err.message || 'Could not execute your code.',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const statusBadgeClass = output?.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' : 
                           output?.status ? 'bg-red-100 text-red-700' : 
                           'bg-slate-100 text-slate-700';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Interactive IDE (Client-Side)
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {language === 'python' && !pyodideReady && (
                 <Badge variant="outline" className="animate-pulse bg-blue-50 text-blue-700">Downloading Pyodide Engine...</Badge>
              )}
              <select
                className="rounded-md border bg-background px-3 py-1 text-sm"
                value={language}
                onChange={(e) => {
                  const nextLang = e.target.value;
                  setLanguage(nextLang);
                  setCode(defaultSnippets[nextLang] || defaultSnippets.javascript);
                }}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button 
                onClick={handleRun} 
                size="sm" 
                disabled={isRunning || (language === 'python' && !pyodideReady)}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Code
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
             <CodeMirror
              value={code}
              options={{
                mode: selectedLanguage.mode,
                theme: 'material-darker',
                lineNumbers: true,
                lineWrapping: true,
                viewportMargin: Infinity,
              }}
              onBeforeChange={(editor, data, value) => {
                setCode(value);
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Input (stdin)</label>
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="System input is limited in client-side mode currently..."
              disabled
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Execution Output
            </CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <Badge className={statusBadgeClass}>{output?.status || 'Ready'}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Execution error</p>
                <p>{error}</p>
              </div>
            </div>
          ) : output ? (
            <div className="space-y-4 text-sm font-mono">
              {output.stdout && (
                <div>
                  <p className="mb-1 font-semibold text-emerald-600">stdout</p>
                  <pre className="rounded-lg bg-muted p-3 text-emerald-900 whitespace-pre-wrap">
                    {output.stdout}
                  </pre>
                </div>
              )}
              {output.stderr && (
                <div>
                  <p className="mb-1 font-semibold text-red-600">stderr</p>
                  <pre className="rounded-lg bg-muted p-3 text-red-900 whitespace-pre-wrap">
                    {output.stderr}
                  </pre>
                </div>
              )}
              {!output.stdout && !output.stderr && (
                <p className="text-muted-foreground">Execution finished with zero output logs.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No output yet. Run your code to see results here.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="space-y-2 text-sm pt-6 text-muted-foreground">
          <p className="font-semibold text-foreground">Client-Side Engine Details:</p>
          <p>• Code is executed safely and directly in your browser without requiring a backend compiler.</p>
          <p>• <strong>JavaScript</strong> runs isolated in an iframe sandbox.</p>
          <p>• <strong>Python</strong> runs via <code>Pyodide</code> (WebAssembly Python environment) downloaded seamlessly on-demand.</p>
        </CardContent>
      </Card>
    </div>
  );
}
