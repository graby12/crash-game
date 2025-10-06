// TermsModal.jsx
import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const TermsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center md:p-6">
      {/* Background overlay click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:w-3/4 lg:w-1/2 max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-lg font-semibold">Terms of Service</h2>
          <button
            className="p-2 rounded-full hover:bg-gray-100"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
       <div className="overflow-y-auto p-4 space-y-4 text-sm leading-relaxed text-black">
          <p>
            <strong>1. INTRODUCTION</strong><br />
            These Terms of Service (“Terms”) govern your use of our website, mobile
            applications, and all related services. By creating an account or
            using our services, you acknowledge that you have read, understood,
            and agree to be bound by these Terms.
          </p>

          <p>
            <strong>2. ELIGIBILITY</strong><br />
            You must be of legal age as required in your jurisdiction to use our
            services. By registering, you confirm that you meet the minimum legal
            age requirement and are legally capable of entering into binding agreements.
          </p>

          <p>
            <strong>3. ACCOUNT REGISTRATION</strong><br />
            To access our services, you may be required to register for an account.
            You agree to provide accurate, complete, and up-to-date information during
            registration and to keep this information updated at all times.
          </p>

          <p>
            <strong>4. ACCOUNT RESPONSIBILITY</strong><br />
            You are solely responsible for maintaining the confidentiality of your
            login credentials and for all activities that occur under your account.
            We shall not be held liable for any unauthorized use of your account.
          </p>

          <p>
            <strong>5. USE OF SERVICES</strong><br />
            Our services are intended for personal and non-commercial use only.
            You agree not to misuse our platform for fraudulent or unlawful activities.
          </p>

          <p>
            <strong>6. PAYMENT & DEPOSITS</strong><br />
            Deposits must be made using approved payment methods. We reserve the right
            to decline deposits that do not meet compliance or security standards.
          </p>

          <p>
            <strong>7. WITHDRAWALS</strong><br />
            Withdrawals are subject to verification and approval. We may withhold
            withdrawals until your identity and payment details are confirmed.
          </p>

          <p>
            <strong>8. BONUSES & PROMOTIONS</strong><br />
            Any bonuses or promotional offers are subject to separate terms and
            conditions. We reserve the right to modify or withdraw promotions at
            any time without prior notice.
          </p>

          <p>
            <strong>9. FAIR USE</strong><br />
            You agree not to manipulate or abuse our systems, including exploiting
            software bugs, loopholes, or unfair practices. Any such activity may
            result in account suspension or termination.
          </p>

          <p>
            <strong>10. FRAUD PREVENTION</strong><br />
            We monitor transactions to detect fraudulent or suspicious behavior.
            If fraud is suspected, we may suspend your account and report the activity
            to relevant authorities.
          </p>

          <p>
            <strong>11. COMPLIANCE WITH LAW</strong><br />
            You must comply with all applicable laws and regulations when using our
            services. We will cooperate with authorities in cases of suspected
            unlawful activity.
          </p>

          <p>
            <strong>12. CHANGES TO SERVICES</strong><br />
            We reserve the right to update, modify, or discontinue any part of the
            services without notice. Continued use of the platform after changes
            constitutes acceptance of the updated Terms.
          </p>

          <p>
            <strong>13. LIMITATIONS OF USE</strong><br />
            You must not misuse our platform, including attempting to hack, disrupt,
            or interfere with service operations. Any violation may result in account
            closure and legal action.
          </p>

          <p>
            <strong>14. PRIVACY</strong><br />
            Your use of the services is also governed by our Privacy Policy, which
            explains how we collect, store, and process your personal information.
          </p>

          {/* FIXED ORDER: 20–23 go here */}
          <p>
            <strong>15. ACCOUNT SECURITY</strong><br />
            You are solely responsible for maintaining the confidentiality of your
            account credentials, including your username and password. Any activity
            that occurs under your account will be deemed as having been carried out
            by you. We are not liable for any loss or damage resulting from your
            failure to secure your login details.
          </p>

          <p>
            <strong>16. RESPONSIBLE GAMING</strong><br />
            We are committed to promoting responsible gambling. You may set deposit
            limits, stake limits, or request self-exclusion from our services at any
            time. If you believe you have a gambling problem, please seek professional
            help and make use of the responsible gambling tools provided on our platform.
          </p>

          <p>
            <strong>17. SUSPENSION & TERMINATION</strong><br />
            We reserve the right to suspend or permanently close your account if you
            are suspected of fraudulent activity, money laundering, breach of these
            Terms, or if required by law or regulatory authorities. Any funds remaining
            may be withheld pending investigation.
          </p>

          <p>
            <strong>18. TECHNICAL ISSUES</strong><br />
            While we strive to provide uninterrupted service, we do not guarantee
            that our platform will always be available or error-free. In cases of
            technical malfunction, system errors, or server downtime, we reserve the
            right to void bets or transactions affected by such issues.
          </p>

          {/* continues with 24+ */}
          <p>
            <strong>19. PALPABLE ERRORS</strong><br />
            While every effort is made to ensure there are no errors or omissions in respect of our products and services, the nature of human error or system problems means such circumstances may arise. ...
          </p>
           <p>
            <strong>20. CRASH GAMES TERMS & CONDITIONS</strong><br />
            These terms and conditions (“Terms”) relate to the Crash Games which are provided 
            on our website (“Website”) and mobile application (“App”). The Crash Games are 
            provided by SmartSoft Gaming, a software provider licensed and regulated in 
            Curacao (“Software Provider”).
          </p>

          <p>
            By playing the Crash Games, you agree to these Terms in addition to our general 
            Terms of Service. In the event of any conflict, these Crash Games Terms shall 
            prevail.
          </p>

          <p>
            <strong>21. Game Rules:</strong><br />
            The objective of the Crash Games is to place a bet and cash out before the 
            multiplier crashes. If you cash out before the crash, your winnings equal 
            your stake multiplied by the multiplier at the time of cash out. If you fail 
            to cash out before the crash, you lose your stake.
          </p>

          <p>
            <strong>22. Fair Play:</strong><br />
            The Crash Games use a provably fair system with results determined by a 
            cryptographic algorithm. The multiplier value is generated randomly and cannot 
            be influenced by us, the Software Provider, or you as a player.
          </p>

          <p>
            <strong>23. Liability:</strong><br />
            We are not responsible for losses incurred due to disconnections, lag, or other 
            technical issues on your side. In the case of system malfunctions or errors 
            on our part, bets may be voided and stakes refunded at our discretion.
          </p>

          <p>
            <strong>24. Betting Limits:</strong><br />
            Minimum and maximum betting limits apply to the Crash Games. These limits 
            are displayed in the game interface and may be updated from time to time.
          </p>

          <p>
            <strong>25. Responsible Gaming:</strong><br />
            You acknowledge that playing the Crash Games carries risk. Please ensure that 
            you play responsibly and within your means. If you need help, please refer to 
            our Responsible Gaming section.
          </p>

          <p>
            <strong>26. Software Provider:</strong><br />
            The Crash Games are powered by SmartSoft Gaming. By playing, you also agree to 
            the Software Provider’s terms and conditions, available on their official website.
          </p>

          {/* 26. Vegas Games Terms & Conditions */}
          <p>
            <strong>27. VEGAS GAMES TERMS & CONDITIONS</strong><br />
            The Vegas Games are online slot and casino-style games available on our platform. 
            These games are supplied by licensed third-party software providers and may be 
            subject to their own terms and conditions in addition to ours.
          </p>

          <p>
            <strong>28. Game Availability:</strong><br />
            Vegas Games may be added, modified, or removed at any time without prior notice. 
            Game availability can vary depending on your region and applicable laws.
          </p>

          <p>
            <strong>29. Betting & Payouts:</strong><br />
            Each Vegas Game has its own rules, payout structures, and betting limits. These 
            are displayed within the game itself and form part of these Terms. Please ensure 
            you review the rules of each game before playing.
          </p>

          <p>
            <strong>30. Random Number Generator (RNG):</strong><br />
            Outcomes of all Vegas Games are determined by a certified Random Number Generator. 
            The RNG ensures fairness and randomness, and its functioning is independently tested.
          </p>

          <p>
            <strong>31. Malfunctions:</strong><br />
            In the event of any malfunction in the Vegas Games or associated software, all 
            affected bets and winnings are void. Stakes may be refunded at our discretion.
          </p>

          <p>
            <strong>32. Third-Party Providers:</strong><br />
            By playing Vegas Games, you agree to the rules and conditions set by the 
            third-party providers that supply the software. We do not accept liability 
            for any disputes arising directly from third-party providers.
          </p>

          {/* 27. Cash Out */}
          <p>
            <strong>33. CASH OUT</strong><br />
            The Cash Out feature (“Cash Out”) allows you to settle a bet before the event has 
            finished. By using Cash Out, you can secure a return that is lower or higher than 
            the original potential winnings depending on the progress of the event.
          </p>

          <p>
            <strong>34. Availability:</strong><br />
            Cash Out is offered at our discretion and may not be available for all bets, 
            markets, or events. We reserve the right to withdraw or suspend the Cash Out 
            feature at any time without notice.
          </p>

          <p>
            <strong>35. Cash Out Value:</strong><br />
            The amount offered via Cash Out is calculated in real-time based on current 
            odds, market conditions, and stake. The value may change or be removed 
            depending on live events.
          </p>

          <p>
            <strong>36. Finality:</strong><br />
            Once you confirm a Cash Out, the decision is final. The resulting amount will 
            be credited to your balance immediately, and the original bet is considered 
            settled regardless of the eventual outcome.
          </p>

          <p>
            <strong>37. Errors & Malfunctions:</strong><br />
            In the event of any error in the calculation or display of Cash Out values, 
            or if the Cash Out is mistakenly offered, we reserve the right to void 
            the Cash Out transaction. Stakes may be reinstated where appropriate.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <button
            onClick={onClose}
            className="w-full bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 transition"
          >
            Okay
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TermsModal;
