"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Key,
  Eye,
  Clock,
  Sparkles,
  ArrowRight,
  Database,
  Terminal,
  Zap,
  CheckCircle2,
  Code2,
  FileCode2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";

export default function LandingPage() {
  const { setDemoMode } = useAuthStore();
  const [simulatedPlaintext, setSimulatedPlaintext] = React.useState("Meet me at 18:00 UTC with the keys.");
  const [isEncrypted, setIsEncrypted] = React.useState(true);

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/70 py-20 lg:py-28 bg-[#0B0C0E]">
        {/* Subtle background ambient mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))] pointer-events-none" />

        <div className="container mx-auto px-4 text-center max-w-4xl relative z-10 space-y-6">
          <div className="inline-flex items-center space-x-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs text-emerald-400 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Zero-Knowledge Cryptographic Messaging</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.15]">
            Quiet Security. <br />
            <span className="text-emerald-400 font-mono font-medium">
              End-to-End Encrypted.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            CipherChat encrypts message payloads and media attachments directly inside your device&apos;s Web Crypto enclave using
            NIST P-256 ECDH and authenticated AES-256-GCM. The server never observes plaintext, private keys, or unencrypted data.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" variant="primary" className="h-11 px-6 shadow-md shadow-emerald-950/40">
                <span>Start Chatting Securely</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

            <Link href="/chat">
              <Button
                size="lg"
                variant="secondary"
                className="h-11 px-6 border-border/80"
                onClick={() => setDemoMode(true)}
              >
                <Sparkles className="h-4 w-4 mr-2 text-amber-400" />
                <span>Explore Interactive Demo</span>
              </Button>
            </Link>

            <Link href="/docs/security">
              <Button size="lg" variant="outline" className="h-11 px-6 border-border/80">
                <Lock className="h-4 w-4 mr-2 text-emerald-400" />
                <span>Security Whitepaper</span>
              </Button>
            </Link>
          </div>

          {/* Interactive Cryptographic Simulation Card */}
          <div className="mt-14 rounded-2xl border border-border/80 bg-card/90 p-5 sm:p-7 text-left shadow-2xl backdrop-blur-xl max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center space-x-2">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="font-mono text-xs text-muted-foreground ml-2">
                  Live Wire Envelope Inspection
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEncrypted(!isEncrypted)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-mono transition-colors"
              >
                View {isEncrypted ? "Decrypted Plaintext" : "Wire Ciphertext"}
              </button>
            </div>

            <div className="font-mono text-xs space-y-2.5">
              <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                <span>// Sender Device: 005f... (Alice)</span>
                <span className="text-emerald-400 font-semibold">ECDSA P-256 Signed</span>
              </div>

              {isEncrypted ? (
                <div className="rounded-xl bg-[#090A0C] p-3.5 text-emerald-400/90 break-all border border-emerald-500/20 space-y-1.5 font-mono text-xs">
                  <p className="text-muted-foreground text-[10px] tracking-wider uppercase font-sans">
                    Fastify &amp; PostgreSQL observe only this authenticated ciphertext:
                  </p>
                  <code className="text-[11px] leading-relaxed block text-emerald-400">
                    &#123;&quot;alg&quot;:&quot;ECDH-P-256&quot;,&quot;iv&quot;:&quot;4+7v3e1L4Q0x9K==&quot;,&quot;cipher&quot;:&quot;7q929fms019kjwdmq902389fmcqmsknclsdkfj&quot;,&quot;tag&quot;:&quot;3Q9d8m1x0p4w8z==&quot;&#125;
                  </code>
                </div>
              ) : (
                <div className="rounded-xl bg-secondary/50 p-3.5 text-foreground border border-border space-y-1.5">
                  <p className="text-muted-foreground text-[10px] tracking-wider uppercase font-sans">
                    Decrypted locally inside authorized recipient device memory:
                  </p>
                  <p className="text-sm font-sans font-medium text-foreground">
                    &ldquo;{simulatedPlaintext}&rdquo;
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span>Cipher: AES-256-GCM + HKDF-SHA256</span>
                <span className="text-emerald-400 font-medium">Zero Server Knowledge</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Security Principles */}
      <section className="py-20 container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-14 space-y-2">
          <Badge variant="outline" className="border-border text-muted-foreground text-xs">
            Architecture Pillars
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Engineered for Transparent Confidentiality
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
            Constructed with standard W3C Web Cryptography primitives and peer-reviewed design patterns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-border/80 bg-card/80 p-6 space-y-3.5 backdrop-blur-sm">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-2.5 w-fit text-emerald-400">
              <Key className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Client-Side Enclave Keys</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ECDSA identity keys and ECDH prekeys are generated locally using the browser&apos;s
              native Web Crypto API. Private keys are never transmitted to our servers.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/80 p-6 space-y-3.5 backdrop-blur-sm">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-2.5 w-fit text-emerald-400">
              <Eye className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Atomic View-Limit Policies</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enforce one-view and two-view restrictions on sensitive media. Server database
              transactions atomically reject duplicate view attempts and purge expired records.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/80 p-6 space-y-3.5 backdrop-blur-sm">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-2.5 w-fit text-emerald-400">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Disappearing Rooms & Groups</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Configure room-wide TTL policies (e.g. 24 hours). Ephemeral messages self-destruct
              automatically across active devices and are deleted permanently from the database.
            </p>
          </div>
        </div>
      </section>

      {/* Technology Stack Matrix */}
      <section className="py-12 border-t border-border/70 bg-[#0B0C0E]">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Production-Ready Full Stack</h3>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Next.js App Router • Fastify WebSockets • PostgreSQL Prisma • W3C Web Crypto
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/register">
                <Button variant="primary" size="md">
                  <span>Create Encrypted Account</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
