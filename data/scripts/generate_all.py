"""Orchestrator: runs all synthetic data generators in order."""
import generate_instruments
import generate_users
import generate_transactions


def main():
    print("--- Generating investment universe ---")
    generate_instruments.main()

    print("--- Generating user profiles ---")
    generate_users.main()

    print("--- Generating transaction/UPI logs ---")
    generate_transactions.main()

    print("All synthetic data generated in ../output/")


if __name__ == "__main__":
    main()
