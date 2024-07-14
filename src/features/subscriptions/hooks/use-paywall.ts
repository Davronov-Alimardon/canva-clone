import { useSubscriptionModal } from "@/features/subscriptions/store/use-subscription-modal";
import { useGetSubscription } from "@/features/subscriptions/api/use-get-subscription";

export const usePaywall = () => {
  const { 
    data: subscription,
    isLoading: isLoadingSubscription,
  } = useGetSubscription();

  const subscriptionModal = useSubscriptionModal();

  const shouldBlock = isLoadingSubscription || !subscription?.active;

  return {
    isLoading: isLoadingSubscription,
    shouldBlock,
    triggerPaywall: () => {
      subscriptionModal.onOpen();
    },
  };
};
