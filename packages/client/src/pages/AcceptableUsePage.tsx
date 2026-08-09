import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button.js';

export default function AcceptableUsePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <nav className="border-b border-border bg-bg-elevated sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Home
          </Button>
          <span className="font-semibold text-primary text-sm">Acceptable Use Policy</span>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="prose prose-invert prose-sm sm:prose-base max-w-none prose-headings:text-primary prose-a:text-accent prose-p:text-secondary prose-li:text-secondary prose-strong:text-primary"
          dangerouslySetInnerHTML={{ __html: "<h1>Martinari Acceptable Use Policy</h1>\n<p><strong>Last updated:</strong> August 9, 2026</p>\n<p>Martinari is intended for legitimate, lawful, person-to-person file transfers.</p>\n<p>You may not use Martinari to facilitate illegal activity or to harm other people, systems, or networks.</p>\n<h2>1. Prohibited Content and Activities</h2>\n<p>You may not use Martinari to transfer, distribute, request, or facilitate:</p>\n<h3>Illegal Material</h3>\n<p>Any content whose possession, distribution, or transmission is prohibited by applicable law.</p>\n<h3>Copyright and Intellectual-Property Infringement</h3>\n<p>Unauthorized distribution of copyrighted works, software, media, documents, or other intellectual property.</p>\n<p>This includes using Martinari primarily to distribute pirated copies of copyrighted material.</p>\n<h3>Malware</h3>\n<p>Malicious software including:</p>\n<ul>\n<li>Viruses.</li>\n<li>Worms.</li>\n<li>Ransomware.</li>\n<li>Spyware.</li>\n<li>Trojans.</li>\n<li>Credential-stealing software.</li>\n<li>Destructive scripts.</li>\n<li>Other software designed to compromise or damage systems.</li>\n</ul>\n<h3>Fraud and Credential Theft</h3>\n<p>Activities intended to:</p>\n<ul>\n<li>Steal passwords or credentials.</li>\n<li>Conduct phishing.</li>\n<li>Impersonate another person or organization.</li>\n<li>Defraud another person.</li>\n<li>Distribute fraudulent documents or software.</li>\n</ul>\n<h3>Unauthorized Access</h3>\n<p>Attempts to gain unauthorized access to:</p>\n<ul>\n<li>Computers.</li>\n<li>Accounts.</li>\n<li>Networks.</li>\n<li>Servers.</li>\n<li>Devices.</li>\n<li>Martinari infrastructure.</li>\n</ul>\n<h3>Abuse of the Service</h3>\n<p>You may not:</p>\n<ul>\n<li>Deliberately overload Martinari infrastructure.</li>\n<li>Generate excessive automated connections.</li>\n<li>Attempt to circumvent rate limits.</li>\n<li>Scan or attack Martinari infrastructure.</li>\n<li>Exploit vulnerabilities.</li>\n<li>Interfere with other users&#39; transfers.</li>\n<li>Attempt to disrupt WebRTC or signaling functionality.</li>\n</ul>\n<h3>Harassment and Abuse</h3>\n<p>Martinari must not be used to facilitate:</p>\n<ul>\n<li>Threats.</li>\n<li>Stalking.</li>\n<li>Targeted harassment.</li>\n<li>Extortion.</li>\n<li>Doxxing.</li>\n<li>Other abusive conduct.</li>\n</ul>\n<h2>2. User Responsibility</h2>\n<p>You are responsible for the files you transfer and for ensuring that your use of Martinari complies with applicable law.</p>\n<p>Martinari does not routinely inspect the contents of peer-to-peer transfers because files are designed to travel directly between participating browsers.</p>\n<p>This does not make prohibited activity permissible.</p>\n<h2>3. Security Reports</h2>\n<p>If you discover a security vulnerability in Martinari, please report it privately rather than attempting to exploit it against other users or the service.</p>\n<p><strong>Security contact:</strong> <a href=\"mailto:ichi@mail.ee\">ichi@mail.ee</a></p>\n<h2>4. Copyright Reports</h2>\n<p>Copyright owners or authorized representatives who believe that Martinari is being used in connection with infringement may contact:</p>\n<p><strong>Copyright contact:</strong> <a href=\"mailto:ichi@mail.ee\">ichi@mail.ee</a></p>\n<p>Reports should contain enough information for us to understand the allegation and identify the relevant room, link, or technical information where available.</p>\n<p>Because Martinari is a peer-to-peer service, Martinari may not possess the transferred file or be technically capable of removing content that never reaches its infrastructure.</p>\n<h2>5. Enforcement</h2>\n<p>Where appropriate and legally permitted, Martinari may take measures against abuse, including:</p>\n<ul>\n<li>Blocking connections.</li>\n<li>Limiting traffic.</li>\n<li>Closing rooms.</li>\n<li>Blocking abusive infrastructure or clients.</li>\n<li>Preserving relevant technical information where necessary and lawful.</li>\n<li>Cooperating with lawful requests from competent authorities.</li>\n</ul>\n<p>The measures taken will depend on the circumstances and the information technically available to Martinari.</p>\n<h2>6. Changes</h2>\n<p>This Acceptable Use Policy may be updated as Martinari develops or as legal and security requirements change.</p>\n<p>The latest version will be published on Martinari.</p>\n<h2>7. Contact</h2>\n<p>For abuse or legal reports:</p>\n<p><strong><a href=\"mailto:ichi@mail.ee\">ichi@mail.ee</a></strong></p>\n<p>For security vulnerabilities:</p>\n<p><strong><a href=\"mailto:ichi@mail.ee\">ichi@mail.ee</a></strong></p>\n<p>For general questions:</p>\n<p><strong><a href=\"mailto:ichi@mail.ee\">ichi@mail.ee</a></strong></p>\n" }}
        />
      </main>
    </div>
  );
}
