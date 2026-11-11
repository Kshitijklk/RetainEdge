export function About() {
    return (
        <div className="space-y-6">
            <div className="panel p-6 md:p-8">
                <p className="text-xs uppercase tracking-[0.18em] text-text-muted">About RetainEdge</p>
                <h1 className="mt-3 font-display text-3xl text-text md:text-4xl">Helping businesses keep valuable customers</h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted">
                    RetainEdge is a customer retention platform built to help businesses understand which customers may leave and why.
                    It uses customer data and machine learning to predict churn risk, so teams can take action before customers leave.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="panel p-6">
                    <h2 className="text-xl font-medium text-text">What this project does</h2>
                    <p className="mt-3 text-sm leading-7 text-text-muted">
                        The system allows users to upload customer datasets, review their information, and run prediction models to find
                        which customers are at risk. It also gives simple explanations for each prediction so teams can understand the main
                        reasons behind the risk.
                    </p>
                </div>

                <div className="panel p-6">
                    <h2 className="text-xl font-medium text-text">Why it is useful</h2>
                    <p className="mt-3 text-sm leading-7 text-text-muted">
                        Businesses lose customers for many reasons, such as low engagement, weak satisfaction, or changing buying behavior.
                        RetainEdge helps teams spot those risk signs early and take better action to protect revenue and customer relationships.
                    </p>
                </div>
            </div>

            <div className="panel p-6 md:p-8">
                <h2 className="text-xl font-medium text-text">Services provided</h2>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-text-muted">
                    <li>• Customer dataset upload and management</li>
                    <li>• Data review and dataset inspection</li>
                    <li>• Churn prediction and risk analysis</li>
                    <li>• Customer-level risk explanations</li>
                    <li>• Prediction summaries and reporting for business decisions</li>
                    <li>• User profile and account access management</li>
                </ul>
            </div>
        </div>
    );
}
