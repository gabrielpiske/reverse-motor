> **Instruções ao Agente de IA:**
> Leia rigorosamente estas regras antes de gerar qualquer código (seja front-end Next.js ou firmware C++). Você atua como Engenheiro de Automação e Desenvolvedor Full-Stack.

---

## 1. Regras Críticas de Engenharia (Intertravamento K1/K2)

A principal responsabilidade deste sistema é garantir que **os Relés K1 e K2 nunca sejam acionados ao mesmo tempo**, prevenindo a destruição do circuito físico.

1. **Intertravamento via Software (IHM):** A interface web no Next.js deve desabilitar o botão de ligar o K2 se o K1 estiver ativo. Para reverter, o usuário deve ser forçado a clicar em "Parar" (OFF) primeiro, ou a interface deve injetar um passo de "OFF" automático antes de enviar o acionamento do sentido oposto.
2. **Intertravamento via Firmware (Arduino):** A última barreira de proteção é o código C++. A máquina de estados deve ignorar qualquer comando `CMD:K1_ON` se o pino D8 (K2) estiver ativo. O código precisa forçar a transição para estado `IDLE` (ambos em nível ALTO / Relés OFF) antes de comutar a rotação.
3. **Watchdog Failsafe:** Implemente a verificação via `millis()`. Se o Arduino ficar mais de 3.000 ms sem receber a string `CMD:PING\n` da porta serial, ele deve escrever `HIGH` (desligar) nos pinos D7 e D8 imediatamente.

## 2. Estrutura da Aplicação Web (Next.js)

O laboratório possui **12 bancadas (A até L)**. Todas as rotas de bancada são parametrizadas por `[id]` e os dados ficam em `bancadas/{id}` no Firebase.

* **/controle/[id]:** Interface de usuário mobile-first (aberta pelo QR Code da bancada) contendo:
    - Botão Verde: "Girar Direita (K1)"
    - Botão Azul: "Girar Esquerda (K2)"
    - Botão Vermelho Gigante: "Parar / Emergência"
    - Painel de status visual mostrando qual relé está atracado.
* **/bancada/[id]:** A página que deve ficar aberta no computador físico conectado via USB ao Arduino. Ela gerencia o `navigator.serial`, faz o parse das mensagens `CMD:` vindas do Firebase e repassa para a porta COM, além de devolver as mensagens `STATE:` lidas da porta COM para o Firebase. Exibe o QR Code de acesso à IHM.
* **/** e **/qrcodes:** Painel do instrutor com as 12 bancadas e folha de impressão dos QR Codes.

## 3. Padrões de Código

* Use **TypeScript estrito**. Defina tipos para os estados: `type MotorState = 'IDLE' | 'K1_RUNNING' | 'K2_RUNNING' | 'EMERGENCY';`
* Para comunicação Serial na `/bancada`, utilize `TextEncoderStream` e `TextDecoderStream` fragmentando as mensagens sempre que encontrar um caractere `\n` (quebra de linha).
* Sempre considere que o módulo relé é **Active LOW**. Para ligar o motor, o pino digital vai para `LOW`. Para desligar/segurança, o pino digital vai para `HIGH`. Especifique isso no momento da declaração do `pinMode` escrevendo `HIGH` imediatamente para evitar que o relé ligue sozinho no boot.