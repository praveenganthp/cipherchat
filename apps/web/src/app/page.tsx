"use client";

import * as React from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Key,
  Eye,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Database,
  Terminal,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";

export default function LandingPage() {
  const { setDemoMode } = useAuthStore();
  const [simulatedPlaintext, setSimulatedPlaintext] = React.useState("Meet me at 18:00 UTC with the keys.");
  const [isEncrypted, setIsEncrypted] = React.useState(true);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/60 py-20 lg:py-28 bg-gradient-to-b from-navy-900 via-navy-950 to-navy-900">
        <div className="container mx-auto px-4 text-center max-w-4xl relative z-10">
          <Badge variant="default" className="mb-4 py-1 px-3 text-xs">
            <Shield className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Zero-Knowledge Cryptographic Messaging
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
            True Privacy. <br />
            <span className="bg-gradient-to-r from-primary via-accent to-cipher-violet bg-clip-text text-transparent">
              End-to-End Encrypted.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            CipherChat encrypts message payloads and media attachments on your device using
            W3C Web Crypto ECDH P-256 and AES-256-GCM. The server never observes plaintext,
            private keys, or unencrypted files.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" variant="primary" className="shadow-lg shadow-primary/25">
                <span>Start Chatting Securely</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

            <Link href="/chat">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setDemoMode(true)}
              >
                <Sparkles className="h-4 w-4 mr-2 text-amber-400" />
                <span>Explore Interactive Demo</span>
              </Button>
            </Link>

            <Link href="/docs/security">
              <Button size="lg" variant="outline">
                <Lock className="h-4 w-4 mr-2 text-primary" />
                <span>Security Architecture</span>
              </Button>
            </Link>
          </div>

          {/* Interactive Cryptographic Simulation Card */}
          <div className="mt-14 rounded-2xl border border-border bg-card/70 p-6 text-left shadow-2xl backdrop-blur-md max-w-2xl mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="font-mono text-xs text-muted-foreground ml-2">
                  Live Envelope Inspection
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEncrypted(!isEncrypted)}
                className="text-xs text-primary hover:underline font-mono"
              >
                Toggle {isEncrypted ? "Plaintext" : "Ciphertext"}
              </button>
            </div>

            <div className="mt-4 font-mono text-xs space-y-2">
              <div className="text-muted-foreground flex items-center justify-between">
                <span>// Sender Device: 005f... (Alice)</span>
                <span className="text-emerald-400">ECDSA P-256 Signed</span>
              </div>

              {isEncrypted ? (
                <div className="rounded-lg bg-navy-950 p-3 text-emerald-400/90 break-all border border-emerald-500/20">
                  <p className="text-muted-foreground text-[10px] mb-1">
                    SERVER OBSERVES ONLY THIS CIPHERTEXT ENVELOPE:
                  </p>
                  <code>
                    eyJhbGciOiJFQ0RILVAtMjU2IiwiZW52Ijp7Iml2IjoiNCs3djNlMUw0UTB4OUsiLCJjaXBoZXIiOiI3cTkyOWZtczAxOWtqd2RtcTkwMjM4OWZtY3Ftc2tuY2xzZGtmamhzZGs3Mjk4MzduY2tzIiwiYXV0aFRhZyI6IjNROWQ4bTF4MHA0dzh6PT0ifX0=
                  </code>
                </div>
              ) : (
                <div className="rounded-lg bg-secondary/80 p-3 text-foreground border border-border">
                  <p className="text-muted-foreground text-[10px] mb-1">
                    DECRYPTED ONLY ON AUTHORIZED RECIPIENT DEVICE:
                  </p>
                  <p className="text-sm font-sans font-medium text-primary-foreground">
                    &ldquo;{simulatedPlaintext}&rdquo;
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>Algorithm: AES-256-GCM + HKDF-SHA256</span>
                <span className="text-primary">Zero Server Knowledge</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Security Principles */}
      <section className="py-16 container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Built for Transparent Confidentiality
          </h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-xl mx-auto">
            Engineered from first principles with verified open standards and zero hidden backdoors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="rounded-lg bg-primary/20 p-2.5 w-fit text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Client-Side Key Generation</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ECDSA identity keys and ECDH prekeys are generated locally using the browser&apos;s
              native Web Crypto API. Private keys are never transmitted to our servers.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="rounded-lg bg-cipher-violet/20 p-2.5 w-fit text-cipher-violet">
              <Eye className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Strict View-Limit Policies</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enforce one-view and two-view restrictions on sensitive media. Server database
              transactions atomically reject duplicate view attempts and purge expired records.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="rounded-lg bg-emerald-500/20 p-2.5 w-fit text-emerald-400">
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
      <section className="py-12 border-t border-border/60 bg-navy-950/60">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Production-Ready Architecture</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Next.js App Router • Fastify WebSockets • PostgreSQL Prisma • Web Crypto
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/register">
                <Button variant="primary" size="md">
                  Create Encrypted Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
