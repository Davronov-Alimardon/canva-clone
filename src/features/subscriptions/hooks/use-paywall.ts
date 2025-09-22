import { useSubscriptionModal } from "@/features/subscriptions/store/use-subscription-modal";
import { useGetSubscription } from "@/features/subscriptions/api/use-get-subscription";

export const usePaywall = () => {
  const { 
    data: subscription,
    isLoading: isLoadingSubscription,
  } = useGetSubscription();

  const subscriptionModal = useSubscriptionModal();

  // TODO: TESTING MODE - Disable paywall for development
  // const shouldBlock = isLoadingSubscription || !subscription?.active;
  const shouldBlock = false; // Set to true to re-enable paywall

  return {
    isLoading: isLoadingSubscription,
    shouldBlock,
    triggerPaywall: () => {
      subscriptionModal.onOpen();
    },
  };
};
