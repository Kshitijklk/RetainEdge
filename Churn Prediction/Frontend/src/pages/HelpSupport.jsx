const faqs = [
    {
        q: 'What is RetainEdge?',
        a: 'RetainEdge is a simple customer churn management platform. It helps businesses find customers who may leave and highlights the main reasons behind the risk.',
    },
    {
        q: 'How does the prediction work?',
        a: 'You upload customer data, the system checks it, and the model gives each customer a risk score. It then shows which factors are pushing that customer towards churn.',
    },
    {
        q: 'Do I need technical knowledge to use it?',
        a: 'No. The dashboard is designed to be easy to use. You only need to upload a dataset, review the results, and act on the insights shown in the platform.',
    },
    {
        q: 'What kind of reports do I get?',
        a: 'You get customer risk summaries, dataset details, prediction results, and customer-level explanations so you can understand what is causing the risk.',
    },
    {
        q: 'Can I contact the team for help?',
        a: 'Yes. If you need help with uploads, results, or account access, you can email our support team using the contact address listed at the bottom of this page.',
    },
];

export function HelpSupport() {
    return (
        <div className="space-y-6">
            <div className="panel p-6 md:p-8">
                <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Help & Support</p>
                <h1 className="mt-3 font-display text-3xl text-text md:text-4xl">We are here to help</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
                    Need help using RetainEdge? This page gives quick answers to common questions and a simple way to contact us.
                </p>
            </div>

            <div className="panel p-5 md:p-6">
                <div className="space-y-4">
                    {faqs.map(({ q, a }) => (
                        <div key={q} className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                            <h2 className="text-base font-medium text-text">{q}</h2>
                            <p className="mt-2 text-sm leading-6 text-text-muted">{a}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="panel p-6 md:p-8">
                <h2 className="text-xl font-medium text-text">Still need help?</h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                    If your issue is not covered here, please contact our support team and we will be happy to assist you.
                </p>
                <a
                    href="mailto:support@retainedge.com"
                    className="mt-4 inline-flex items-center rounded-[12px] bg-gradient-to-r from-[#935073] via-[#7b4968] to-[#B0778B] px-4 py-2.5 text-sm font-medium text-[#F8F4E9]"
                >
                    support@retainedge.com
                </a>
            </div>
        </div>
    );
}
