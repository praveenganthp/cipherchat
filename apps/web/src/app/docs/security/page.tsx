"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Key,
  Database,
  Eye,
  Clock,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SecurityDocsPage() {
  return (
    <div className="flex-1 bg-navy-900 py-12 px-4 sm:px-6">
      <div className="container mx-auto max-w-4xl space-y-10">
        {/* Header */}
        <div className="space-y-3">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to Messaging
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <Badge variant="default">Security Whitepaper</Badge>
            <Badge variant="outline">Web Crypto W3C</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            CipherChat Cryptographic Architecture & Security Specification
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This document outlines the cryptographic primitives, zero-knowledge threat model, key
            exchange mechanisms, forward secrecy ratchets, and view-count enforcement guarantees.
          </p>
        </div>

        {/* Threat Model Section */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-lg bg-primary/20 p-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-foreground">1. Zero-Knowledge Threat Model</h2>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            CipherChat operates under an <strong>Untrusted Server / Hostile Transport</strong> threat
            model. Even if an attacker gains full root access to the PostgreSQL database, intercepts
            WebSocket network packets, or operates a malicious relay:
          </p>

          <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-5">
            <li>
              <strong className="text-foreground">Plaintext Confidentiality:</strong> Message
              bodies and media attachments are encrypted on the sender&apos;s device with AES-256-GCM.
              The server never receives private encryption keys or unencrypted ciphertext payloads.
            </li>
            <li>
              <strong className="text-foreground">Tamper Resistance:</strong> Any alteration of
              ciphertext, initialization vector (IV), or envelope metadata in transit or within the
              database causes immediate cryptographic authentication failure on the recipient device.
            </li>
            <li>
              <strong className="text-foreground">Forward Secrecy:</strong> Each message envelope
              employs an ephemeral ECDH key agreement. Compromise of long-term identity keys cannot
              retroactively decrypt previously delivered conversations.
            </li>
          </ul>
        </section>

        {/* Cryptographic Primitives Table */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-lg bg-cipher-violet/20 p-2 text-cipher-violet">
              <Key className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-foreground">2. Cryptographic Primitives</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Purpose</th>
                  <th className="py-2 pr-4 font-semibold">Primitive</th>
                  <th className="py-2 pr-4 font-semibold">Specification</th>
                  <th className="py-2 font-semibold">Parameters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-foreground">
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Device Identity & Signing</td>
                  <td className="py-2.5 pr-4 font-mono text-primary">ECDSA</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">FIPS 186-4</td>
                  <td className="py-2.5">NIST P-256 + SHA-256</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Asymmetric Key Agreement</td>
                  <td className="py-2.5 pr-4 font-mono text-primary">ECDH</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">NIST SP 800-56A</td>
                  <td className="py-2.5">NIST P-256 (secp256r1)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Key Derivation Function</td>
                  <td className="py-2.5 pr-4 font-mono text-primary">HKDF</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">RFC 5869</td>
                  <td className="py-2.5">HKDF-SHA-256 (Domain separated)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Symmetric Authenticated Cipher</td>
                  <td className="py-2.5 pr-4 font-mono text-primary">AES-GCM</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">NIST SP 800-38D</td>
                  <td className="py-2.5">256-bit key, 96-bit IV, 128-bit tag</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Safety Fingerprints</td>
                  <td className="py-2.5 pr-4 font-mono text-primary">SHA-256</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">FIPS 180-4</td>
                  <td className="py-2.5">12 numeric blocks (60 digits)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Message Flow Architecture */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-foreground">3. Message Envelope Lifecycle</h2>
          </div>

          <div className="space-y-3 font-mono text-xs text-muted-foreground">
            <div className="rounded-xl bg-navy-950 p-4 border border-border/80 space-y-2">
              <p className="text-primary font-semibold">// 1. Client Encrypts Outbound Envelope</p>
              <p>ephemeralKey = generateECDHKeyPair(&quot;P-256&quot;)</p>
              <p>sharedSecret = ECDH(ephemeralKey.private, recipientSignedPreKey)</p>
              <p>messageKey = HKDF_SHA256(sharedSecret, salt, info)</p>
              <p>ciphertext = AES_256_GCM_Encrypt(messageKey, iv, aad, plaintextPayload)</p>
              <p>signature = ECDSA_Sign(senderIdentityPrivateKey, envelopeDigest)</p>
            </div>

            <div className="rounded-xl bg-navy-950 p-4 border border-border/80 space-y-2">
              <p className="text-emerald-400 font-semibold">// 2. Fastify Server Stores &amp; Relays</p>
              <p>INSERT INTO &quot;EncryptedMessage&quot; (recipientDeviceId, ciphertext, iv, authTag, signature, ephemeralPublicKey)</p>
              <p>// Server observes NO plaintext or decryption keys</p>
            </div>

            <div className="rounded-xl bg-navy-950 p-4 border border-border/80 space-y-2">
              <p className="text-accent font-semibold">// 3. Recipient Verifies &amp; Decrypts</p>
              <p>verifySignature = ECDSA_Verify(senderIdentityPublicKey, signature, envelopeDigest)</p>
              <p>sharedSecret = ECDH(recipientPreKeyPrivate, ephemeralPublicKey)</p>
              <p>messageKey = HKDF_SHA256(sharedSecret, salt, info)</p>
              <p>plaintextPayload = AES_256_GCM_Decrypt(messageKey, iv, aad, ciphertext)</p>
            </div>
          </div>
        </section>

        {/* Transparent Limitations */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-foreground">4. Honest Limitations &amp; Disclosures</h2>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            In compliance with open-source security transparency standards, we explicitly document
            the architectural boundaries and physical constraints of the system:
          </p>

          <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-5">
            <li>
              <strong>Endpoint Malware &amp; Screen Capture:</strong> If an attacker compromises the
              operating system or physical device running the browser, they can observe content
              rendered on screen. View-once and view-twice policies enforce atomic server delivery
              limits, but cannot physically prevent photography with an external camera.
            </li>
            <li>
              <strong>Transport Metadata:</strong> While message content is cryptographically opaque,
              the service provider can observe connection metadata: IP addresses, account identifiers,
              message timestamps, and room membership rosters.
            </li>
            <li>
              <strong>Audit Status:</strong> CipherChat is open-source software built upon standardized
              W3C Web Crypto primitives, but has not yet undergone an independent commercial security
              audit.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
