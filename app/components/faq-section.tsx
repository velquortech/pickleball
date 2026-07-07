import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    question: "How do I play at Pickleball District?",
    answer:
      "Walk in and check in with staff — no reservation needed for open play. Your name goes on the live queue, and when a court opens up you and three other players are called for a 20-minute match.",
  },
  {
    question: "Do I need to book in advance?",
    answer:
      "Only for private court rentals and coaching, which run on our VIP courts. Open play is first-come, first-served through the walk-in queue. Booking online holds a VIP court exclusively for your group.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Open play is ₱200 per head per session. Private VIP court rental is ₱600 per hour (up to 4 players), and coaching sessions are ₱900 per hour. Pay open play at the desk; bookings are paid online.",
  },
  {
    question: "How do online bookings work?",
    answer:
      "Pick a date and time slot, pay online, and you get a booking reference code (like PB-XXXXXXXX) instantly. Show the code at the front desk when you arrive. Unpaid bookings release their slot after 15 minutes.",
  },
  {
    question: "Do I need to be good to join open play?",
    answer:
      "No. All skill levels are welcome, from first-timers to tournament players. Queue position decides who plays next, not skill — and loaner paddles are available at the desk.",
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6"
    >
      <div className="mb-10 flex flex-col gap-3 text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary">
          FAQ
        </p>
        <h2 className="font-heading text-balance text-4xl font-black tracking-tight">
          Questions, answered.
        </h2>
      </div>

      <Accordion multiple={false} className="w-full">
        {FAQS.map((faq, index) => (
          <AccordionItem key={faq.question} value={`faq-${index}`}>
            <AccordionTrigger className="text-left text-base font-medium">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-7 text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
