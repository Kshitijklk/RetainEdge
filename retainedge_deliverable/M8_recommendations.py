"""
RetainEdge - Module 8: Retention Recommendations
"""


def generate_recommendation(row):

    reason = row.get(
        "primary_churn_reason",
        ""
    )

    risk = row.get(
        "churn_risk",
        ""
    )

    support_calls = row.get(
        "Support Calls",
        0
    )

    payment_delay = row.get(
        "Payment Delay",
        0
    )

    usage_frequency = row.get(
        "Usage Frequency",
        0
    )

    tenure = row.get(
        "Tenure",
        0
    )

    total_spend = row.get(
        "Total Spend",
        0
    )

    last_interaction = row.get(
        "Last Interaction",
        0
    )

    if risk == "Low":

        return (
            "Continue regular engagement "
            "and monitor the customer."
        )

    if reason == "Support Calls":

        if support_calls >= 10:

            return (
                "Prioritize support intervention "
                "and resolve outstanding service issues."
            )

        return (
            "Follow up with the customer "
            "to resolve service issues."
        )

    if reason == "Payment Delay":

        if payment_delay >= 15:

            return (
                "Prioritize payment assistance "
                "and offer a suitable payment arrangement."
            )

        return (
            "Send a payment reminder "
            "and offer convenient payment options."
        )

    if reason == "Usage Frequency":

        if usage_frequency <= 5:

            return (
                "Launch a personalized engagement "
                "campaign to increase product usage."
            )

        return (
            "Encourage continued product usage "
            "through personalized engagement."
        )

    if reason == "Tenure":

        if tenure <= 6:

            return (
                "Provide an onboarding and early-stage "
                "retention offer."
            )

        return (
            "Offer a loyalty benefit based on "
            "customer tenure."
        )

    if reason == "Contract Length":

        return (
            "Offer a suitable contract renewal "
            "option with a retention benefit."
        )

    if reason == "Total Spend":

        if total_spend > 0:

            return (
                "Provide a personalized value-based "
                "offer to retain the customer."
            )

        return (
            "Offer a personalized pricing "
            "or value benefit."
        )

    if reason == "Last Interaction":

        if last_interaction > 30:

            return (
                "Re-engage the customer with personalized "
                "communication and a relevant offer."
            )

        return (
            "Follow up with personalized communication "
            "to maintain engagement."
        )

    if reason == "Subscription Type":

        return (
            "Review the customer's current subscription "
            "and offer a more suitable plan."
        )

    if reason == "Age":

        return (
            "Use personalized engagement based on "
            "the customer's account behavior."
        )

    if reason == "Gender":

        return (
            "Use personalized engagement based on "
            "the customer's account behavior."
        )

    return (
        "Prioritize the customer for personalized "
        "retention outreach."
    )


def generate_recommendations(df):

    result = df.copy()

    result[
        "retention_recommendation"
    ] = result.apply(
        generate_recommendation,
        axis=1
    )

    return result


def run_recommendations(df):

    return generate_recommendations(
        df
    )


def print_recommendation_summary(df):

    recommendations = df[
        "retention_recommendation"
    ]

    counts = recommendations.value_counts()

    total = len(
        recommendations
    )

    print(
        "\n[RECOMMENDATIONS] Completed"
    )

    print(
        "\nRecommendation categories:"
    )

    for recommendation, count in counts.items():

        percentage = (
            count /
            total *
            100
        )

        print(
            f"{recommendation}: "
            f"{count} "
            f"({percentage:.2f}%)"
        )