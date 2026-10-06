# Sistema de Controle de Reversão de Motor (K1 / K2)

Este repositório contém o código-fonte de uma aplicação web de supervisão (IHM) e o firmware do Arduino para o controle seguro da **partida e reversão de um motor trifásico utilizando dois relés de 5V (K1 e K2)**, em um laboratório didático com **12 bancadas (A até L)**.

O projeto utiliza a arquitetura de **Web Serial API**, permitindo que o navegador se comunique diretamente com o Arduino via cabo USB, enquanto os comandos e telemetria são sincronizados em tempo real na nuvem utilizando **Firebase**. Cada bancada possui um **QR Code** que abre a IHM de controle daquela bancada no celular do aluno.

## Tecnologias Utilizadas

* **Frontend / IHM:** Next.js (App Router), TypeScript, Tailwind CSS, `qrcode.react`
* **Nuvem / Sincronização:** Firebase Realtime Database
* **Comunicação de Bancada:** Web Serial API nativa (dispensa instalação de drivers ou softwares intermediários)
* **Hardware:** Arduino (Uno/Nano/Mega) + 2x Módulos Relé 5V (Active LOW)

## Regras de Negócio e Segurança Física (Intertravamento)

Este projeto foi desenhado com foco em segurança de hardware e software:
1. **Nunca ligar K1 e K2 simultaneamente:** Evita curto-circuito (fase-fase ou inversão direta) no motor.
2. **Transição Segura:** Ao solicitar a inversão de giro (ex: de K1 para K2), o sistema obrigatoriamente desliga o relé atual, aguarda um tempo de transição (inércia do motor) e só então liga o relé oposto.
3. **Fail-Safe / Watchdog:** Se o Arduino parar de receber comunicação da página web por mais de 3 segundos, ele desliga K1 e K2 automaticamente.

O intertravamento existe em **três camadas**: IHM do aluno (botões bloqueados), estação da bancada (recusa comandos cruzados) e firmware (máquina de estados + leitura do pino oposto). Se a estação perder a conexão com a nuvem, ela envia `CMD:OFF` automaticamente.

> ⚠️ Os relés de 5V devem comandar **contatoras** dimensionadas para o motor — nunca a carga trifásica diretamente. Mantenha também o intertravamento elétrico (contatos NF cruzados) nas contatoras.

## Estrutura

```text
firmware/reverse_motor/reverse_motor.ino   Firmware do Arduino
src/app/page.tsx                           Painel do instrutor (12 bancadas)
src/app/qrcodes/page.tsx                   Folha de impressão dos QR Codes
src/app/bancada/[id]/page.tsx              Estação da bancada (Web Serial ↔ Firebase)
src/app/controle/[id]/page.tsx             IHM mobile do aluno
src/lib/                                   Tipos, Firebase, ponte serial, constantes
database.rules.json                        Regras do Realtime Database
```

## Como Iniciar

1. Leia o arquivo `CONTEXT.md` para entender a topologia e a pinagem do Arduino.
2. Utilize o arquivo `AGENT.md` como prompt de instrução para ferramentas de IA assistirem no desenvolvimento do código.
3. Faça o upload do firmware `firmware/reverse_motor/reverse_motor.ino` para o Arduino de cada bancada.
4. Crie um projeto no Firebase com **Realtime Database**, publique as regras de `database.rules.json` (Console > Realtime Database > Regras, ou `firebase deploy --only database`).
5. Copie `.env.example` para `.env.local` e preencha as chaves do Firebase e `NEXT_PUBLIC_APP_URL` (endereço que os celulares vão acessar).
6. `npm install` e `npm run dev` para iniciar a interface web.

## Uso em aula

1. No PC de cada bancada, abra **Chrome/Edge** em `/bancada/A` (B, C, ... L) e clique em **Conectar Arduino**.
2. O aluno escaneia o QR Code (na tela da bancada ou impresso em `/qrcodes`) e controla o motor em `/controle/A`.
3. O instrutor acompanha todas as bancadas em `/`.

### Sobre a URL do QR Code

* A Web Serial só funciona em **https://** ou **http://localhost** — por isso a estação da bancada normalmente usa `localhost` ou o deploy (ex.: Vercel).
* O QR Code usa `NEXT_PUBLIC_APP_URL`. Em produção, use a URL do deploy (ex.: `https://reverse-motor.vercel.app`). Em rede local, use o IP do servidor (`http://192.168.0.10:3000`) e rode `npm run dev:lan`.