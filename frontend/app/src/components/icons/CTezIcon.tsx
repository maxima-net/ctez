export interface ICTezIconProps {
  width?: number;
  height?: number;
}

export const CTezIcon: React.FC<ICTezIconProps> = ({ width = 40, height = 40 }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="14" cy="14" r="14" fill="url(#paint0_linear)" />
      <path
        d="M5.33325 12.1196C5.33325 13.5808 5.84422 14.6737 6.86615 15.3982C7.49767 15.845 8.21532 16.0684 9.01908 16.0684C10.2132 16.0684 11.1146 15.6277 11.7232 14.7461C11.861 14.5408 11.97 14.3355 12.0504 14.1303L11.6026 13.9672C11.1778 14.9212 10.4773 15.4465 9.50134 15.5431C9.40948 15.5552 9.31763 15.5612 9.22577 15.5612C8.41052 15.5612 7.77325 15.1325 7.31396 14.2752C6.96949 13.6231 6.79725 12.8502 6.79725 11.9566C6.79725 10.3747 7.19339 9.31804 7.98567 8.7867C8.31866 8.56934 8.6861 8.46066 9.08798 8.46066C9.70803 8.46066 10.0812 8.71425 10.2075 9.22143C10.2305 9.31804 10.2592 9.46899 10.2936 9.67427C10.3625 10.1573 10.4888 10.4592 10.6725 10.58C10.7874 10.6403 10.9137 10.6766 11.0515 10.6886C11.4419 10.7128 11.6887 10.5437 11.7921 10.1815C11.815 10.0969 11.8265 10.0184 11.8265 9.94598C11.8265 9.33011 11.4533 8.82293 10.707 8.42443C10.1788 8.14668 9.60468 8.00781 8.98464 8.00781C7.446 8.00781 6.3724 8.66594 5.76384 9.98221C5.47678 10.6102 5.33325 11.3226 5.33325 12.1196Z"
        fill="white"
      />
      <path
        d="M17.6496 21.4418C16.6037 21.4418 15.8433 21.1877 15.3626 20.6793C14.8848 20.171 14.6459 19.6242 14.6459 19.036C14.6459 18.8203 14.6867 18.64 14.7712 18.4952C14.8528 18.3503 14.9722 18.2292 15.1121 18.1494C15.2577 18.0636 15.4355 18.0223 15.6452 18.0223C15.8579 18.0223 16.0356 18.0636 16.1784 18.1494C16.324 18.2351 16.4377 18.3503 16.5192 18.4952C16.6037 18.6429 16.6445 18.8232 16.6445 19.036C16.6445 19.2961 16.5833 19.506 16.461 19.6715C16.3386 19.834 16.1929 19.9434 16.0269 19.9936C16.1725 20.1976 16.3998 20.3394 16.7115 20.4251C17.0232 20.5168 17.335 20.5611 17.6467 20.5611C18.0808 20.5611 18.4712 20.4429 18.8237 20.2064C19.1733 19.97 19.4326 19.6183 19.5987 19.1572C19.7647 18.6932 19.8492 18.17 19.8492 17.5819C19.8492 16.9435 19.756 16.3997 19.5725 15.9475C19.3947 15.4894 19.1296 15.1524 18.78 14.9308C18.4392 14.715 18.0458 14.5997 17.6467 14.5997C17.3787 14.5997 17.0466 14.712 16.6445 14.9396L15.9103 15.312V14.9396L19.2141 10.4708H14.6459V15.1081C14.6459 15.4923 14.7304 15.8086 14.8965 16.0568C15.0625 16.3051 15.3189 16.4292 15.6656 16.4292C15.9336 16.4292 16.1871 16.3376 16.4318 16.1573C16.6795 15.9741 16.8921 15.7524 17.0669 15.4982C17.0903 15.448 17.1165 15.4096 17.1514 15.3889C17.1806 15.3623 17.2214 15.3475 17.2592 15.3475C17.3204 15.3475 17.3932 15.377 17.4748 15.4421C17.5535 15.5307 17.5914 15.6371 17.5914 15.7554C17.5826 15.8352 17.5681 15.915 17.5506 15.9918C17.3612 16.4204 17.099 16.7484 16.7669 16.973C16.4406 17.1947 16.0589 17.3129 15.6656 17.3129C14.6751 17.3129 13.9904 17.1149 13.6117 16.7218C13.2329 16.3258 13.0436 15.7908 13.0436 15.114V10.4738H10.707V9.61075H13.0436V7.64531L12.5104 7.10444V6.66406H14.0633L14.6459 6.96848V9.6078L20.6854 9.59302L21.2855 10.2019L17.5826 13.9584C17.8069 13.8668 18.0429 13.8106 18.2847 13.7899C18.6839 13.7899 19.1355 13.92 19.6366 14.18C20.1435 14.4342 20.531 14.783 20.8048 15.2293C21.0787 15.6696 21.2535 16.0923 21.3292 16.5002C21.4137 16.908 21.4545 17.2686 21.4545 17.5848C21.4545 18.306 21.303 18.9799 21.0029 19.6005C20.7029 20.2212 20.2455 20.6823 19.6336 20.9896C19.0218 21.2882 18.3605 21.4418 17.6496 21.4418Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="paint0_linear"
          x1="-1.20556"
          y1="-10.2353"
          x2="29.1662"
          y2="-9.9713"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.122751" stopColor="#0F62FF" />
          <stop offset="1" stopColor="#6B5BD2" />
        </linearGradient>
      </defs>
    </svg>
  );
};
