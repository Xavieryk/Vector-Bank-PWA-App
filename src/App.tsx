import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
} from 'react'
import './App.css'

type TabId = 'home' | 'transfers' | 'accounts' | 'support'
type HomeWidgetId = 'actions' | 'operations' | 'rates'
type ScreenId =
  | 'home'
  | 'transfers'
  | 'contacts'
  | 'amount'
  | 'sourceCards'
  | 'cardDetails'
  | 'review'
  | 'otp'
  | 'processing'
  | 'success'
  | 'transferError'
  | 'receipt'
  | 'profile'
  | 'settings'
  | 'expenses'
  | 'favoriteTemplates'

type Contact = {
  id: number
  initials: string
  name: string
  phone: string
  avatarUrl?: string
  favorite?: boolean
  transferCount?: number
  color: 'green' | 'blue'
}

type PhoneContact = {
  name?: string[]
  tel?: string[]
}

type ContactsManager = {
  select: (
    properties: Array<'name' | 'tel'>,
    options?: { multiple?: boolean },
  ) => Promise<PhoneContact[]>
}

type NavigatorWithContacts = Navigator & {
  contacts?: ContactsManager
}

type Operation = {
  id: string
  title: string
  subtitle: string
  amount: string
  tone: 'income' | 'outcome'
  contactPhone?: string
  sourceCardId?: string
  destinationBankId?: string
}

type FavoriteTemplate = {
  id: string
  title: string
  kind: 'beeline' | 'operation'
  operation?: Operation
}

type HomeWidgetSetting = {
  id: HomeWidgetId
  title: string
  visible: boolean
}

type BankCard = {
  id: string
  title: string
  type: string
  number: string
  balance: string
  brand: string
}

type BalanceVisibilityMap = Record<string, boolean>

type DestinationBank = {
  id: string
  name: string
  iconFile: string
}

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>
}

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike
}

const ASSET_BASE = '/svg+%20%D0%BA%D0%B0%D1%80%D1%82%D0%B8%D0%BD%D0%BA%D0%B8/'

const destinationBanks: DestinationBank[] = [
  { id: 'sberbank', name: 'Сбербанк', iconFile: 'Sberbank_Logo_2020 1.svg' },
  { id: 'alfa', name: 'Альфа-Банк', iconFile: 'Alfa-Bank 1.svg' },
  { id: 'gazprom', name: 'Газпромбанк', iconFile: 'Gazprombank 1.svg' },
  { id: 'tbank', name: 'Т-Банк', iconFile: 'T-Bank_RU_logo 1.svg' },
]

const bankCards: BankCard[] = [
  {
    id: 'main',
    title: 'Основной счёт',
    type: 'Дебетовая карта',
    number: '4756••••••••1234',
    balance: '2,000.00 ₽',
    brand: 'VISA',
  },
  {
    id: 'salary',
    title: 'Зарплатная карта',
    type: 'Платёжная карта',
    number: '5489••••••••7721',
    balance: '48,350.25 ₽',
    brand: 'MIR',
  },
  {
    id: 'savings',
    title: 'Общий баланс',
    type: 'Сберегательный счёт',
    number: '4081••••••••0098',
    balance: '126,900.00 ₽',
    brand: 'RUB',
  },
]

const defaultContacts: Contact[] = [
  {
    id: 1,
    initials: 'АА',
    name: 'Андрей Арбуз',
    phone: '+7 913 555 53 22',
    favorite: true,
    color: 'green',
  },
  {
    id: 2,
    initials: 'АЛ',
    name: 'Аня Лобзик',
    phone: '+7 923 210 18 72',
    color: 'blue',
  },
  {
    id: 3,
    initials: 'ББ',
    name: 'Боря Баскервилли',
    phone: '+7 913 445 77 00',
    color: 'green',
  },
  {
    id: 4,
    initials: 'БО',
    name: 'Бройлеры опт',
    phone: '+7 383 250 14 61',
    color: 'blue',
  },
  {
    id: 5,
    initials: 'ВВ',
    name: 'Варя Вокал',
    phone: '+7 923 540 67 11',
    color: 'green',
  },
  {
    id: 6,
    initials: 'ВД',
    name: 'Валера двери',
    phone: '+7 952 330 09 50',
    color: 'blue',
  },
]

const initialOperations: Operation[] = [
  {
    id: 'food',
    title: 'Вкусно и Точка',
    subtitle: 'Кафе и фастфуды • Сегодня',
    amount: '-1,230 ₽',
    tone: 'outcome',
  },
  {
    id: 'salary',
    title: 'АГУ',
    subtitle: 'Зарплата • Вчера',
    amount: '+1,300 ₽',
    tone: 'income',
  },
]

const transferModes = [
  { title: 'Между счетами', icon: <WalletsIcon /> },
  { title: 'Из другого банка', icon: <BankIcon /> },
  { title: 'По номеру карты', icon: <CardIcon /> },
  { title: 'Реквизиты', icon: <ListIcon /> },
  { title: 'Интернет ТВ, телефон', icon: <MonitorIcon /> },
  { title: 'ЖКХ', icon: <HomeLineIcon /> },
]

const defaultFavoriteTemplates: FavoriteTemplate[] = [
  { id: 'beeline', title: 'Мой мобильный', kind: 'beeline' },
]

const defaultHomeWidgets: HomeWidgetSetting[] = [
  { id: 'actions', title: 'Быстрые действия', visible: true },
  { id: 'operations', title: 'Последние операции', visible: true },
  { id: 'rates', title: 'Курсы валют', visible: true },
]

const currencyRates = [
  { code: 'USD', name: 'Доллар США', buy: '91.20', sell: '93.10' },
  { code: 'EUR', name: 'Евро', buy: '98.40', sell: '101.05' },
  { code: 'CNY', name: 'Юань', buy: '12.58', sell: '13.20' },
]

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [screen, setScreen] = useState<ScreenId>('home')
  const [contactsList, setContactsList] = usePersistedState<Contact[]>(
    'bank.contacts',
    defaultContacts,
  )
  const [selectedContact, setSelectedContact] = useState<Contact>(defaultContacts[0])
  const [search, setSearch] = useState('')
  const [amountDigits, setAmountDigits] = usePersistedState('bank.amount', '10000')
  const [operations, setOperations] = usePersistedState<Operation[]>(
    'bank.operations',
    initialOperations,
  )
  const [favoriteTemplates, setFavoriteTemplates] = usePersistedState<FavoriteTemplate[]>(
    'bank.favoriteTemplates',
    defaultFavoriteTemplates,
  )
  const [cards, setCards] = usePersistedState<BankCard[]>('bank.cards', bankCards)
  const [otpDigits, setOtpDigits] = useState(['', '', '', ''])
  const [otpError, setOtpError] = useState(false)
  const [otpTimer, setOtpTimer] = useState(59)
  const [showInsufficientFunds, setShowInsufficientFunds] = useState(false)
  const [showDestinationBanks, setShowDestinationBanks] = useState(false)
  const [showTemplateSheet, setShowTemplateSheet] = useState(false)
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [contactsStatus, setContactsStatus] = useState('')
  const [selectedOperationDetails, setSelectedOperationDetails] = useState<Operation | null>(null)
  const [activeCardIndex, setActiveCardIndex] = usePersistedState('bank.activeCardIndex', 0)
  const [selectedSourceCardId, setSelectedSourceCardId] = usePersistedState(
    'bank.selectedSourceCardId',
    bankCards[0].id,
  )
  const [selectedDestinationBankId, setSelectedDestinationBankId] = usePersistedState(
    'bank.selectedDestinationBankId',
    destinationBanks[0].id,
  )
  const [balanceVisibility, setBalanceVisibility] = usePersistedState<BalanceVisibilityMap>(
    'bank.balanceVisibility',
    {},
  )
  const [homeWidgets, setHomeWidgets] = usePersistedState<HomeWidgetSetting[]>(
    'bank.homeWidgets',
    defaultHomeWidgets,
  )
  const [strongConfirmationThreshold, setStrongConfirmationThreshold] = usePersistedState(
    'bank.strongConfirmationThreshold',
    '10000',
  )
  const [toastMessage, setToastMessage] = useState('')
  const toastTimer = useRef<number | null>(null)

  const amount = useMemo(() => Number(amountDigits || '0'), [amountDigits])
  const amountText = useMemo(() => formatAmountInput(amountDigits), [amountDigits])
  const normalizedHomeWidgets = useMemo(() => normalizeHomeWidgets(homeWidgets), [homeWidgets])
  const normalizedFavoriteTemplates = useMemo(
    () => normalizeFavoriteTemplates(favoriteTemplates),
    [favoriteTemplates],
  )
  const strongConfirmationLimit = useMemo(
    () => Math.max(0, Number(strongConfirmationThreshold) || 0),
    [strongConfirmationThreshold],
  )
  const filteredContacts = useMemo(
    () => filterContacts(search, contactsList),
    [contactsList, search],
  )
  const groupedContacts = useMemo(() => groupContacts(filteredContacts), [filteredContacts])
  const favoriteContacts = filteredContacts.filter((contact) => contact.favorite)
  const frequentContacts = useMemo(() => getFrequentContacts(contactsList), [contactsList])
  const displayBankCards = useMemo(() => getCardsWithTotalSavings(cards), [cards])
  const sourceBankCards = useMemo(
    () => displayBankCards.filter((card) => card.id !== 'savings'),
    [displayBankCards],
  )
  const selectedSourceCard =
    sourceBankCards.find((card) => card.id === selectedSourceCardId) ?? sourceBankCards[0]
  const selectedDestinationBank =
    destinationBanks.find((bank) => bank.id === selectedDestinationBankId) ?? destinationBanks[0]
  const isCardBalanceVisible = (cardId: string) => balanceVisibility[cardId] ?? true
  const toggleCardBalance = (cardId: string) => {
    setBalanceVisibility((current) => ({
      ...current,
      [cardId]: !(current[cardId] ?? true),
    }))
  }

  useEffect(() => {
    if (screen !== 'otp' || otpTimer <= 0) {
      return
    }

    const timer = window.setTimeout(() => setOtpTimer((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [screen, otpTimer])

  useEffect(() => {
    if (screen !== 'processing') {
      return
    }

    const timer = window.setTimeout(() => {
      const shouldFail = selectedContact.id === 6 || amount === 99999
      if (shouldFail) {
        setScreen('transferError')
        return
      }

      setOperations((current) => [
        {
          id: `transfer-${Date.now()}`,
          title: selectedContact.name,
          subtitle: 'Перевод по СБП • Сегодня',
          amount: `-${amountText} ₽`,
          tone: 'outcome',
          contactPhone: selectedContact.phone,
          sourceCardId: selectedSourceCard.id,
          destinationBankId: selectedDestinationBank.id,
        },
        ...current,
      ])
      setCards((current) => debitCardBalance(current, selectedSourceCard.id, amount))
      setContactsList((current) =>
        current.map((contact) =>
          contact.id === selectedContact.id
            ? { ...contact, transferCount: (contact.transferCount ?? 0) + 1 }
            : contact,
        ),
      )
      setScreen('success')
    }, 1700)

    return () => window.clearTimeout(timer)
  }, [amount, amountText, screen, selectedContact, selectedDestinationBank.id, selectedSourceCard.id, setCards, setContactsList, setOperations])

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current)
      }
    }
  }, [])

  const showToast = (message: string) => {
    setToastMessage(message)

    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current)
    }

    toastTimer.current = window.setTimeout(() => {
      setToastMessage('')
      toastTimer.current = null
    }, 2500)
  }

  const openTab = (tab: TabId) => {
    setActiveTab(tab)
    if (tab === 'home') {
      setScreen('home')
    }
    if (tab === 'transfers') {
      setScreen('transfers')
    }
    if (tab === 'accounts' || tab === 'support') {
      setScreen(tab === 'accounts' ? 'home' : 'home')
    }
  }

  const goBack = () => {
    if (screen === 'settings') {
      setScreen('profile')
      return
    }
    if (screen === 'profile') {
      setScreen('home')
      setActiveTab('home')
      return
    }
    if (screen === 'expenses') {
      setScreen('home')
      setActiveTab('home')
      return
    }
    if (screen === 'favoriteTemplates') {
      setScreen('transfers')
      setActiveTab('transfers')
      return
    }
    if (screen === 'contacts') {
      setScreen('transfers')
      return
    }
    if (screen === 'amount') {
      setScreen('transfers')
      return
    }
    if (screen === 'sourceCards') {
      setScreen('amount')
      return
    }
    if (screen === 'cardDetails') {
      setScreen('home')
      setActiveTab('home')
      return
    }
    if (screen === 'review') {
      setScreen('amount')
      return
    }
    if (screen === 'otp') {
      setScreen('review')
      return
    }
    if (screen === 'processing' || screen === 'success' || screen === 'transferError') {
      setScreen('transfers')
      return
    }
    if (screen === 'receipt') {
      setScreen('success')
      return
    }
    setScreen('home')
    setActiveTab('home')
  }

  const startTransfer = (contact: Contact) => {
    setSelectedContact(contact)
    setSearch('')
    setScreen('amount')
    setActiveTab('transfers')
  }

  const repeatTransferFromOperation = (operation: Operation) => {
    const contact =
      contactsList.find((item) => operation.contactPhone && normalizePhone(item.phone) === normalizePhone(operation.contactPhone)) ??
      contactsList.find((item) => item.name === operation.title) ??
      selectedContact

    setSelectedContact(contact)
    setAmountDigits(formatAmountForInput(Math.abs(parseMoney(operation.amount))))
    if (operation.sourceCardId) {
      setSelectedSourceCardId(operation.sourceCardId)
    }
    if (operation.destinationBankId) {
      setSelectedDestinationBankId(operation.destinationBankId)
    }
    if (!hasRepeatMetadata(operation)) {
      showToast('Часть данных заполнена по умолчанию')
    }
    setSearch('')
    setSelectedOperationDetails(null)
    setShowTemplateSheet(false)
    setScreen('amount')
    setActiveTab('transfers')
  }

  const addTemplateFromOperation = (operation: Operation) => {
    const template: FavoriteTemplate = {
      id: `operation-${operation.id}`,
      title: truncateText(operation.title, 14),
      kind: 'operation',
      operation,
    }

    setFavoriteTemplates((current) => {
      const baseTemplates = normalizeFavoriteTemplates(current)
      const withoutDuplicate = baseTemplates.filter((item) => item.id !== template.id)
      return [template, ...withoutDuplicate]
    })
    setShowTemplateSheet(false)
    showToast('Шаблон добавлен в избранное')
  }

  const removeFavoriteTemplate = (templateId: string) => {
    setFavoriteTemplates((current) =>
      normalizeFavoriteTemplates(current).filter((template) => template.id !== templateId),
    )
    showToast('Шаблон удалён')
  }

  const submitAmount = () => {
    if (amount > parseMoney(selectedSourceCard.balance)) {
      setShowInsufficientFunds(true)
      return
    }

    if (amount < strongConfirmationLimit) {
      showToast('Подтверждение не требуется по настройкам')
      setScreen('processing')
      return
    }

    setScreen('review')
  }

  const toggleHomeWidget = (widgetId: HomeWidgetId) => {
    setHomeWidgets((current) =>
      normalizeHomeWidgets(current).map((widget) =>
        widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget,
      ),
    )
  }

  const moveHomeWidget = (widgetId: HomeWidgetId, direction: 1 | -1) => {
    setHomeWidgets((current) => {
      const widgets = normalizeHomeWidgets(current)
      const index = widgets.findIndex((widget) => widget.id === widgetId)
      const nextIndex = index + direction

      if (index < 0 || nextIndex < 0 || nextIndex >= widgets.length) {
        return widgets
      }

      const next = [...widgets]
      const [widget] = next.splice(index, 1)
      next.splice(nextIndex, 0, widget)
      return next
    })
  }

  const updateStrongConfirmationThreshold = (value: string) => {
    const normalizedValue = value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')
    setStrongConfirmationThreshold(normalizedValue || '0')
    showToast('Сумма успешно сохранена')
  }

  const toggleFavorite = (contactId: number) => {
    setContactsList((current) =>
      current.map((contact) =>
        contact.id === contactId
          ? { ...contact, favorite: !contact.favorite }
          : contact,
      ),
    )
  }

  const importPhoneContacts = async () => {
    setContactsStatus('')

    if (!window.isSecureContext) {
      setContactsStatus('Доступ к контактам работает только через HTTPS или localhost.')
      return
    }

    const contactsApi = (navigator as NavigatorWithContacts).contacts
    if (!contactsApi?.select) {
      setContactsStatus('Этот браузер не даёт PWA доступ к контактам. Откройте в Chrome на Android.')
      return
    }

    try {
      const pickedContacts = await contactsApi.select(['name', 'tel'], { multiple: true })
      const importedContacts: Contact[] = pickedContacts.reduce<Contact[]>(
        (items, contact) => {
          const normalizedContact = createContactFromPhone(contact)
          if (normalizedContact) {
            items.push(normalizedContact)
          }
          return items
        },
        [],
      )

      if (importedContacts.length === 0) {
        setContactsStatus('Контакты не выбраны.')
        return
      }

      let addedCount = 0
      setContactsList((current) => {
        const knownPhones = new Set(current.map((contact) => normalizePhone(contact.phone)))
        const next = [...current]

        importedContacts.forEach((contact) => {
          if (!knownPhones.has(normalizePhone(contact.phone))) {
            next.push(contact)
            knownPhones.add(normalizePhone(contact.phone))
            addedCount += 1
          }
        })

        return next
      })
      setContactsStatus(
        addedCount > 0
          ? `Добавлено контактов: ${addedCount}`
          : 'Эти контакты уже есть в списке.',
      )
    } catch {
      setContactsStatus('Импорт отменён или доступ к контактам не выдан.')
    }
  }

  const appendAmountDigit = (digit: string) => {
    setAmountDigits((current) => {
      if (digit === '.' && current.includes('.')) {
        return current
      }
      if (digit === '.') {
        return `${current || '0'}.`
      }

      const [, kopecks = ''] = current.split('.')
      if (current.includes('.') && kopecks.length >= 2) {
        return current
      }

      const next = `${current}${digit}`.replace(/^0+(?=\d)/, '')
      const [nextRubles, nextKopecks] = next.split('.')
      const limitedRubles = nextRubles.slice(0, 7) || '0'

      return nextKopecks !== undefined
        ? `${limitedRubles}.${nextKopecks.slice(0, 2)}`
        : limitedRubles
    })
  }

  const removeAmountDigit = () => {
    setAmountDigits((current) => current.slice(0, -1) || '0')
  }

  const updateOtpDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) {
      return
    }

    const next = [...otpDigits]
    next[index] = value
    setOtpDigits(next)
    setOtpError(false)
  }

  const submitOtp = () => {
    if (otpDigits.join('') !== '1234') {
      setOtpError(true)
      return
    }

    setScreen('processing')
  }

  const startOtp = () => {
    setOtpDigits(['', '', '', ''])
    setOtpError(false)
    setOtpTimer(59)
    setScreen('otp')
  }

  const resetToHome = () => {
    setOtpDigits(['', '', '', ''])
    setOtpError(false)
    setScreen('home')
    setActiveTab('home')
  }

  const switchCard = (direction: 1 | -1) => {
    setActiveCardIndex((current) => {
      const next = current + direction
      if (next < 0) {
        return displayBankCards.length - 1
      }
      if (next >= displayBankCards.length) {
        return 0
      }
      return next
    })
  }

  const downloadReceipt = () => {
    const receipt = [
      'Чек по операции',
      `Получатель: ${selectedContact.name}`,
      `Телефон: ${selectedContact.phone}`,
      `Банк получателя: ${selectedDestinationBank.name}`,
      `Сумма: ${amountText} ₽`,
      `Счёт списания: ${formatCardForReceipt(selectedSourceCard)}`,
      'Комиссия: 0 ₽',
      `Дата: ${formatReceiptDate(new Date())}`,
      'Статус: Выполнено',
      'Тип перевода: СБП',
    ].join('\n')

    const blob = new Blob([receipt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'receipt.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  const otpReady = otpDigits.every(Boolean)
  const showBottomNav = !['amount', 'sourceCards', 'cardDetails', 'profile', 'settings', 'expenses'].includes(screen)

  return (
    <div className="app-shell">
      <PhoneFrame>
        {screen !== 'home' && <BackButton onClick={goBack} />}

        <main className={`screen-body screen-${screen}`}>
          {screen === 'home' && activeTab === 'home' && (
            <HomeScreen
              activeCardIndex={activeCardIndex}
              cards={displayBankCards}
              widgets={normalizedHomeWidgets}
              getBalanceVisible={isCardBalanceVisible}
              operations={operations}
              onCardSwitch={switchCard}
              onOpenCardDetails={() => setScreen('cardDetails')}
              onProfile={() => setScreen('profile')}
              onTransfer={() => openTab('transfers')}
              onAllExpenses={() => setScreen('expenses')}
              onOperationSelect={setSelectedOperationDetails}
            />
          )}

          {screen === 'transfers' && (
            <TransfersScreen
              contacts={contactsList}
              frequentContacts={frequentContacts}
              templates={normalizedFavoriteTemplates}
              search={search}
              setSearch={setSearch}
              onOpenContacts={() => setScreen('contacts')}
              onQuickContact={startTransfer}
              onCreateTemplate={() => setShowTemplateSheet(true)}
              onOpenAllTemplates={() => setScreen('favoriteTemplates')}
              onTemplateSelect={(template) => {
                if (template.kind === 'operation' && template.operation) {
                  repeatTransferFromOperation(template.operation)
                  return
                }
                startTransfer(contactsList[0] ?? defaultContacts[0])
              }}
            />
          )}

          {screen === 'contacts' && (
            <ContactsScreen
              search={search}
              setSearch={setSearch}
              favoriteContacts={favoriteContacts}
              groupedContacts={groupedContacts}
              onSelect={startTransfer}
              onToggleFavorite={toggleFavorite}
              onImportPhoneContacts={importPhoneContacts}
              contactsStatus={contactsStatus}
            />
          )}

          {screen === 'amount' && (
            <AmountScreen
              contact={selectedContact}
              selectedSourceCard={selectedSourceCard}
              selectedDestinationBank={selectedDestinationBank}
              amountText={amountText}
              onOpenSourceCards={() => setScreen('sourceCards')}
              onOpenDestinationBanks={() => setShowDestinationBanks(true)}
              onAppend={appendAmountDigit}
              onDelete={removeAmountDigit}
              onSubmit={submitAmount}
            />
          )}

          {screen === 'sourceCards' && (
            <SourceCardsScreen
              cards={sourceBankCards}
              selectedCardId={selectedSourceCard.id}
              onSelect={(cardId) => {
                setSelectedSourceCardId(cardId)
                setShowInsufficientFunds(false)
                setScreen('amount')
              }}
            />
          )}

          {screen === 'cardDetails' && (
            <CardDetailsScreen
              card={displayBankCards[activeCardIndex] ?? displayBankCards[0]}
              isBalanceVisible={isCardBalanceVisible((displayBankCards[activeCardIndex] ?? displayBankCards[0]).id)}
              onToggleBalance={() => toggleCardBalance((displayBankCards[activeCardIndex] ?? displayBankCards[0]).id)}
            />
          )}

          {screen === 'review' && (
            <ReviewScreen
              contact={selectedContact}
              selectedSourceCard={selectedSourceCard}
              selectedDestinationBank={selectedDestinationBank}
              amountText={amountText}
              onChange={() => setScreen('amount')}
              onConfirm={startOtp}
            />
          )}

          {screen === 'otp' && (
            <OtpScreen
              contact={selectedContact}
              digits={otpDigits}
              timer={otpTimer}
              error={otpError}
              ready={otpReady}
              onDigitChange={updateOtpDigit}
              onContinue={submitOtp}
              onResend={() => {
                if (otpTimer === 0) {
                  setOtpTimer(59)
                  setOtpDigits(['', '', '', ''])
                  setOtpError(false)
                }
              }}
            />
          )}

          {screen === 'processing' && <ProcessingScreen />}

          {screen === 'success' && (
            <SuccessScreen
              contact={selectedContact}
              selectedDestinationBank={selectedDestinationBank}
              selectedSourceCard={selectedSourceCard}
              amountText={amountText}
              onReceipt={() => setScreen('receipt')}
              onHome={resetToHome}
            />
          )}

          {screen === 'transferError' && (
            <TransferErrorScreen onRetry={() => setScreen('amount')} />
          )}

          {screen === 'receipt' && (
            <ReceiptScreen
              contact={selectedContact}
              selectedDestinationBank={selectedDestinationBank}
              selectedSourceCard={selectedSourceCard}
              amountText={amountText}
              onSend={downloadReceipt}
            />
          )}

          {activeTab === 'accounts' && screen === 'home' && <AccountsScreen />}
          {activeTab === 'support' && screen === 'home' && <SupportScreen />}

          {screen === 'profile' && (
            <ProfileScreen
              personalContact={contactsList[0] ?? defaultContacts[0]}
              onSettings={() => setScreen('settings')}
            />
          )}

          {screen === 'settings' && (
            <SettingsScreen
              widgets={normalizedHomeWidgets}
              threshold={strongConfirmationThreshold}
              onMoveWidget={moveHomeWidget}
              onToggleWidget={toggleHomeWidget}
              onThresholdChange={updateStrongConfirmationThreshold}
            />
          )}

          {screen === 'expenses' && (
            <AllExpensesScreen
              operations={operations}
              onOperationSelect={setSelectedOperationDetails}
            />
          )}

          {screen === 'favoriteTemplates' && (
            <FavoriteTemplatesScreen
              templates={normalizedFavoriteTemplates}
              contacts={contactsList}
              onTemplateDelete={removeFavoriteTemplate}
              onTemplateSelect={(template) => {
                if (template.kind === 'operation' && template.operation) {
                  repeatTransferFromOperation(template.operation)
                  return
                }
                startTransfer(contactsList[0] ?? defaultContacts[0])
              }}
            />
          )}
        </main>

        {showInsufficientFunds && (
          <InsufficientFundsModal
            amountText={amountText}
            selectedSourceCard={selectedSourceCard}
            onChangeAmount={() => setShowInsufficientFunds(false)}
            onChooseCard={() => {
              setShowInsufficientFunds(false)
              setScreen('sourceCards')
            }}
            onClose={() => setShowInsufficientFunds(false)}
          />
        )}

        {showDestinationBanks && (
          <DestinationBankSheet
            banks={destinationBanks}
            selectedBankId={selectedDestinationBank.id}
            onSelect={(bankId) => {
              setSelectedDestinationBankId(bankId)
              setShowDestinationBanks(false)
            }}
            onClose={() => setShowDestinationBanks(false)}
          />
        )}

        {toastMessage && <Toast message={toastMessage} />}

        {selectedOperationDetails && (
          <TransactionDetailsModal
            operation={selectedOperationDetails}
            card={selectedSourceCard}
            onRepeat={() => repeatTransferFromOperation(selectedOperationDetails)}
            onClose={() => setSelectedOperationDetails(null)}
          />
        )}

        {showTemplateSheet && (
          <TemplateCreateSheet
            operations={operations}
            onClose={() => setShowTemplateSheet(false)}
            onPickHistory={() => setScreen('expenses')}
            onAddTemplate={addTemplateFromOperation}
          />
        )}

        {showQrScanner && <QrScannerModal onClose={() => setShowQrScanner(false)} />}

        {showBottomNav && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={openTab}
            onQrScan={() => setShowQrScanner(true)}
          />
        )}
      </PhoneFrame>
    </div>
  )
}

function usePersistedState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function filterContacts(query: string, sourceContacts: Contact[]) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return sourceContacts
  }

  return sourceContacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(normalized) ||
      contact.phone.toLowerCase().includes(normalized),
  )
}

function getFrequentContacts(sourceContacts: Contact[]) {
  return [...sourceContacts]
    .sort((left, right) => (right.transferCount ?? 0) - (left.transferCount ?? 0))
    .slice(0, 4)
}

function getCardsWithTotalSavings(cards: BankCard[]) {
  const otherCardsTotal = cards
    .filter((card) => card.id !== 'savings')
    .reduce((total, card) => total + parseMoney(card.balance), 0)

  return cards.map((card) =>
    card.id === 'savings'
      ? { ...card, title: 'Общий баланс', balance: formatCurrency(otherCardsTotal) }
      : card,
  )
}

function normalizeHomeWidgets(widgets: HomeWidgetSetting[]) {
  const knownWidgets = new Map(defaultHomeWidgets.map((widget) => [widget.id, widget]))
  const normalized = widgets
    .filter((widget) => knownWidgets.has(widget.id))
    .map((widget) => ({ ...knownWidgets.get(widget.id)!, ...widget }))

  defaultHomeWidgets.forEach((widget) => {
    if (!normalized.some((item) => item.id === widget.id)) {
      normalized.push(widget)
    }
  })

  return normalized
}

function normalizeFavoriteTemplates(templates: FavoriteTemplate[]) {
  const operationTemplates = templates.filter((template) => template.kind === 'operation')
  return [defaultFavoriteTemplates[0], ...operationTemplates]
}

function debitCardBalance(cards: BankCard[], cardId: string, amount: number) {
  if (cardId !== 'savings') {
    return cards.map((card) =>
      card.id === cardId
        ? { ...card, balance: formatCurrency(Math.max(0, parseMoney(card.balance) - amount)) }
        : card,
    )
  }

  let remaining = amount
  return cards.map((card) => {
    if (card.id === 'savings' || remaining <= 0) {
      return card
    }

    const balance = parseMoney(card.balance)
    const debit = Math.min(balance, remaining)
    remaining -= debit

    return { ...card, balance: formatCurrency(balance - debit) }
  })
}

function groupContacts(items: Contact[]) {
  return items.reduce<Record<string, Contact[]>>((groups, contact) => {
    const letter = contact.name[0].toUpperCase()
    groups[letter] ??= []
    groups[letter].push(contact)
    return groups
  }, {})
}

function createContactFromPhone(contact: PhoneContact): Contact | null {
  const name = contact.name?.[0]?.trim() || 'Контакт'
  const phone = contact.tel?.[0]?.trim()

  if (!phone) {
    return null
  }

  return {
    id: createContactId(name, phone),
    initials: getInitials(name),
    name,
    phone,
    favorite: false,
    color: createContactId(name, phone) % 2 === 0 ? 'green' : 'blue',
  } satisfies Contact
}

function createContactId(name: string, phone: string) {
  const source = `${name}-${normalizePhone(phone)}`
  let hash = 0

  for (const char of source) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0
  }

  return Math.abs(hash) + 1000
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const initials = words.slice(0, 2).map((word) => word[0]).join('')
  return (initials || 'К').toUpperCase()
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'Контакт'
}

function formatPhoneForUi(phone: string) {
  const digits = normalizePhone(phone)
  const visibleTail = digits.slice(-4)

  if (!visibleTail) {
    return phone
  }

  return `+7 xxx xxx ${visibleTail.slice(0, 2)} ${visibleTail.slice(2)}`
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

function getCardTail(card: BankCard) {
  const digits = card.number.replace(/\D/g, '')
  return digits.slice(-4) || '0000'
}

function formatCardForReceipt(card: BankCard) {
  return `${card.brand} ${card.title} •••• ${getCardTail(card)}`
}

function getOperationCategory(operation: Operation) {
  if (operation.id.startsWith('transfer-')) {
    return 'Переводы'
  }
  if (operation.id === 'food') {
    return 'Кафе и фастфуд'
  }
  if (operation.tone === 'income') {
    return 'Пополнения'
  }
  return 'Покупки'
}

function parseMoney(value: string) {
  return Number(value.replace(/[^\d.,-]/g, '').replace(/,/g, '')) || 0
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} ₽`
}

function formatAmountInput(value: string) {
  const [rubles = '0', kopecks] = value.split('.')
  const rubleText = new Intl.NumberFormat('ru-RU').format(Number(rubles || '0'))

  return kopecks === undefined ? rubleText : `${rubleText}.${kopecks}`
}

function formatAmountForInput(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, '') || '0'
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
}

function hasRepeatMetadata(operation: Operation) {
  return Boolean(operation.contactPhone && operation.sourceCardId && operation.destinationBankId)
}

function formatReceiptDate(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return <div className="phone-frame">{children}</div>
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="back-button" type="button" onClick={onClick} aria-label="Назад">
      <ArrowLeftIcon />
    </button>
  )
}

function HomeScreen({
  activeCardIndex,
  cards,
  widgets,
  getBalanceVisible,
  operations,
  onCardSwitch,
  onOpenCardDetails,
  onProfile,
  onTransfer,
  onAllExpenses,
  onOperationSelect,
}: {
  activeCardIndex: number
  cards: BankCard[]
  widgets: HomeWidgetSetting[]
  getBalanceVisible: (cardId: string) => boolean
  operations: Operation[]
  onCardSwitch: (direction: 1 | -1) => void
  onOpenCardDetails: () => void
  onProfile: () => void
  onTransfer: () => void
  onAllExpenses: () => void
  onOperationSelect: (operation: Operation) => void
}) {
  const [dragOffset, setDragOffset] = useState(0)
  const [isDraggingCard, setIsDraggingCard] = useState(false)
  const dragStartY = useRef<number | null>(null)
  const didSwipeCard = useRef(false)
  const activeCard = cards[activeCardIndex] ?? cards[0]
  const previousCard = cards[(activeCardIndex - 1 + cards.length) % cards.length]
  const nextCard = cards[(activeCardIndex + 1) % cards.length]
  const hiddenBalance = '•••••• ₽'
  const visibleWidgets = widgets.filter((widget) => widget.visible)
  const hasMultipleCards = cards.length > 1

  const resetCardDrag = () => {
    dragStartY.current = null
    setIsDraggingCard(false)
    setDragOffset(0)
  }

  const finishCardDrag = () => {
    const wasSwipe = Math.abs(dragOffset) > 48
    didSwipeCard.current = wasSwipe

    if (wasSwipe && hasMultipleCards) {
      onCardSwitch(dragOffset < 0 ? 1 : -1)
    }

    resetCardDrag()
  }

  const renderCard = (card: BankCard, className = '', ariaHidden = false) => {
    const hiddenPreviewNumber = card.number.replace(/\d/g, '•')
    const isBalanceVisible = getBalanceVisible(card.id)

    return (
      <article className={`main-card main-card-${card.id} ${className}`} aria-hidden={ariaHidden}>
        <h2>{card.title}</h2>
        <div>
          <p>{card.type}</p>
          <strong>{isBalanceVisible ? card.number : hiddenPreviewNumber}</strong>
          <b>
            {isBalanceVisible ? card.balance : hiddenBalance}
          </b>
        </div>
        <span>{card.brand}</span>
      </article>
    )
  }

  return (
    <section className="screen-content home-content">
      <header className="home-header">
        <button className="home-user home-user-button" type="button" onClick={onProfile}>
          <span className="avatar avatar-xl">
            <img
              alt=""
              aria-hidden="true"
              src={`${ASSET_BASE}${encodeURIComponent('Заглушка на аватарку контакта.svg')}`}
            />
          </span>
          <div>
            <p>Доброе утро,</p>
            <h1>Имя Фамилия</h1>
          </div>
        </button>
        <button className="notification" type="button" aria-label="Уведомления">
          <BellIcon />
        </button>
      </header>

      <section
        className={`card-stack ${isDraggingCard ? 'dragging' : ''}`}
        style={{ '--card-drag': `${dragOffset}px` } as CSSProperties}
        onWheel={(event) => {
          if (Math.abs(event.deltaY) > 12) {
            onCardSwitch(event.deltaY > 0 ? 1 : -1)
          }
        }}
        onPointerDown={(event) => {
          dragStartY.current = event.clientY
          setIsDraggingCard(true)
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (dragStartY.current === null) {
            return
          }

          const nextOffset = Math.max(-82, Math.min(82, event.clientY - dragStartY.current))
          if (Math.abs(nextOffset) > 10) {
            didSwipeCard.current = true
          }
          setDragOffset(nextOffset)
        }}
        onPointerUp={finishCardDrag}
        onPointerCancel={resetCardDrag}
        onClick={() => {
          if (didSwipeCard.current) {
            didSwipeCard.current = false
            return
          }

          onOpenCardDetails()
        }}
      >
        {hasMultipleCards && renderCard(previousCard, 'card-preview card-preview-prev', true)}
        {renderCard(activeCard, 'main-card-active')}
        {hasMultipleCards && renderCard(nextCard, 'card-preview card-preview-next', true)}
      </section>

      {visibleWidgets.length === 0 && (
        <section className="home-empty-widgets">
          <h2>Виджеты скрыты</h2>
          <p>Их можно вернуть в настройках главного экрана.</p>
        </section>
      )}

      {widgets.map((widget) => {
        if (!widget.visible) {
          return null
        }

        if (widget.id === 'actions') {
          return (
            <section className="home-actions" key={widget.id}>
              <ActionButton label="Перевод" onClick={onTransfer} icon={<ArrowUpRightIcon />} />
              <ActionButton label="Оплатить" icon={<ArrowDownLeftIcon />} />
              <ActionButton label="Пополнить" icon={<CardPlusIcon />} />
              <ActionButton label="Выгода" icon={<HeartIcon />} />
            </section>
          )
        }

        if (widget.id === 'rates') {
          return <CurrencyRatesWidget key={widget.id} />
        }

        return (
          <section className="operations-section" key={widget.id}>
            <div className="section-row">
              <h2>Последние операции</h2>
              <button type="button" onClick={onAllExpenses}>Все траты</button>
            </div>
            <div className="operations-list">
              {operations.slice(0, 3).map((operation) => (
                <button
                  className="operation-item"
                  key={operation.id}
                  type="button"
                  onClick={() => onOperationSelect(operation)}
                >
                  <OperationLogo operation={operation} />
                  <div>
                    <h3>{operation.title}</h3>
                    <p>{operation.subtitle}</p>
                  </div>
                  <strong className={operation.tone}>{operation.amount}</strong>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </section>
  )
}

function CurrencyRatesWidget() {
  return (
    <section className="rates-widget">
      <div className="section-row">
        <h2>Курсы валют</h2>
        <button type="button">Сегодня</button>
      </div>

      <div className="rates-list">
        {currencyRates.map((rate) => (
          <article className="rate-item" key={rate.code}>
            <span>{rate.code}</span>
            <div>
              <b>{rate.name}</b>
              <small>Покупка {rate.buy} ₽</small>
            </div>
            <strong>{rate.sell} ₽</strong>
          </article>
        ))}
      </div>
    </section>
  )
}

function AllExpensesScreen({
  operations,
  onOperationSelect,
}: {
  operations: Operation[]
  onOperationSelect: (operation: Operation) => void
}) {
  const expenses = operations.filter((operation) => operation.tone === 'outcome')
  const total = expenses.reduce((sum, operation) => sum + Math.abs(parseMoney(operation.amount)), 0)

  return (
    <section className="screen-content expenses-content with-page-title">
      <h1>Все траты</h1>

      <section className="expenses-summary">
        <span>Потрачено</span>
        <strong>{formatCurrency(total)}</strong>
        <p>{expenses.length} операций</p>
      </section>

      <div className="expenses-list">
        {expenses.length === 0 && (
          <section className="home-empty-widgets">
            <h2>Трат пока нет</h2>
            <p>После переводов и покупок они появятся здесь.</p>
          </section>
        )}

        {expenses.map((operation) => (
          <button
            className="expense-row"
            key={operation.id}
            type="button"
            onClick={() => onOperationSelect(operation)}
          >
            <OperationLogo operation={operation} />
            <div>
              <h2>{operation.title}</h2>
              <p>{operation.subtitle}</p>
            </div>
            <strong>{operation.amount}</strong>
            <ChevronRightIcon />
          </button>
        ))}
      </div>
    </section>
  )
}

function FavoriteTemplatesScreen({
  templates,
  contacts,
  onTemplateSelect,
  onTemplateDelete,
}: {
  templates: FavoriteTemplate[]
  contacts: Contact[]
  onTemplateSelect: (template: FavoriteTemplate) => void
  onTemplateDelete: (templateId: string) => void
}) {
  const [holdingTemplateId, setHoldingTemplateId] = useState<string | null>(null)
  const deleteTimer = useRef<number | null>(null)
  const didDeleteByHold = useRef(false)

  useEffect(() => {
    return () => {
      if (deleteTimer.current) {
        window.clearTimeout(deleteTimer.current)
      }
    }
  }, [])

  const startDeleteHold = (template: FavoriteTemplate) => {
    if (template.kind === 'beeline') {
      return
    }

    setHoldingTemplateId(template.id)
    if (deleteTimer.current) {
      window.clearTimeout(deleteTimer.current)
    }

    deleteTimer.current = window.setTimeout(() => {
      didDeleteByHold.current = true
      onTemplateDelete(template.id)
      setHoldingTemplateId(null)
      deleteTimer.current = null
    }, 2500)
  }

  const cancelDeleteHold = () => {
    if (deleteTimer.current) {
      window.clearTimeout(deleteTimer.current)
      deleteTimer.current = null
    }

    setHoldingTemplateId(null)
  }

  return (
    <section className="screen-content favorite-templates-content with-page-title">
      <h1>Избранное</h1>

      <section className="favorite-templates-hero">
        <span>{templates.length}</span>
        <div>
          <h2>Избранные переводы</h2>
          <p>Быстрый доступ к регулярным платежам и переводам из истории.</p>
        </div>
      </section>

      <div className="favorite-templates-list">
        {templates.map((template) => (
          <button
            className={`favorite-template-row ${holdingTemplateId === template.id ? 'holding-delete' : ''}`}
            key={template.id}
            type="button"
            onClick={() => {
              if (didDeleteByHold.current) {
                didDeleteByHold.current = false
                return
              }

              onTemplateSelect(template)
            }}
            onPointerDown={() => startDeleteHold(template)}
            onPointerUp={cancelDeleteHold}
            onPointerLeave={cancelDeleteHold}
            onPointerCancel={cancelDeleteHold}
            aria-label={
              template.kind === 'operation'
                ? `${template.title}. Удерживайте 2.5 секунды, чтобы удалить`
                : template.title
            }
            disabled={template.kind === 'beeline' && contacts.length === 0}
          >
            <span className={`favorite-template-icon template-${template.kind}`}>
              {template.kind === 'beeline' ? <BeelineLogo /> : <TemplateOperationIcon />}
            </span>
            <div>
              <h2>{template.title}</h2>
              <p>
                {template.kind === 'operation' && template.operation
                  ? `${template.operation.amount} • ${getOperationCategory(template.operation)}`
                  : 'Быстрый перевод на мобильную связь'}
              </p>
            </div>
            <ChevronRightIcon />
          </button>
        ))}
      </div>
    </section>
  )
}

function OperationLogo({ operation }: { operation: Operation }) {
  if (operation.id.startsWith('transfer-')) {
    return (
      <span className="operation-logo operation-logo-transfer">
        <img
          alt=""
          aria-hidden="true"
          src={`${ASSET_BASE}${encodeURIComponent('Заглушка на аватарку контакта.svg')}`}
        />
      </span>
    )
  }

  return <span className="operation-logo" />
}

function ActionButton({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: ReactNode
  onClick?: () => void
}) {
  return (
    <button type="button" className="home-action" onClick={onClick}>
      <span>{icon}</span>
      <b>{label}</b>
    </button>
  )
}

function TransfersScreen({
  contacts,
  frequentContacts,
  templates,
  search,
  setSearch,
  onOpenContacts,
  onQuickContact,
  onCreateTemplate,
  onOpenAllTemplates,
  onTemplateSelect,
}: {
  contacts: Contact[]
  frequentContacts: Contact[]
  templates: FavoriteTemplate[]
  search: string
  setSearch: (value: string) => void
  onOpenContacts: () => void
  onQuickContact: (contact: Contact) => void
  onCreateTemplate: () => void
  onOpenAllTemplates: () => void
  onTemplateSelect: (template: FavoriteTemplate) => void
}) {
  const firstOperationTemplate = templates.find((template) => template.kind === 'operation')
  const visibleTemplates = [
    templates[0] ?? defaultFavoriteTemplates[0],
    ...(firstOperationTemplate ? [firstOperationTemplate] : []),
  ]

  return (
    <section className="screen-content transfers-content with-page-title">
      <h1>Переводы</h1>

      <section className="panel favorite-panel">
        <div className="section-row">
          <h2>Избранное</h2>
          <button type="button" onClick={onOpenAllTemplates}>Все</button>
        </div>
        <div className="template-list">
          {visibleTemplates.map((item) => (
            <button
              className={`template-item template-${item.kind}`}
              key={item.id}
              type="button"
              onClick={() => onTemplateSelect(item)}
              disabled={item.kind === 'beeline' && contacts.length === 0}
            >
              <span>{item.kind === 'beeline' ? <BeelineLogo /> : <TemplateOperationIcon />}</span>
              <b>{item.title}</b>
            </button>
          ))}
          <button
            className="template-item template-create"
            type="button"
            onClick={onCreateTemplate}
          >
            <span><PlusIcon /></span>
            <b>Создать</b>
          </button>
        </div>
      </section>

      <section className="panel phone-transfer-panel">
        <h2>Перевод по номеру телефона</h2>
        <div className="search-field">
          <SearchIcon />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Введите номер/имя получателя"
          />
          <button type="button" onClick={onOpenContacts} aria-label="Контакты">
            <ContactsIcon />
          </button>
        </div>
        <div className="quick-contacts">
          {frequentContacts.map((contact, index) => (
            <button
              className="quick-contact"
              type="button"
              key={contact.id}
              onClick={() => onQuickContact(contact)}
            >
              <ContactAvatar contact={contact} className={`photo ${index < 2 ? 'photo-ring' : ''}`} />
              <b>{getFirstName(contact.name)}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="panel modes-panel">
        {transferModes.map((mode) => (
          <button type="button" key={mode.title} className="mode-tile">
            {mode.icon}
            <span>{mode.title}</span>
          </button>
        ))}
      </section>
    </section>
  )
}

function ContactsScreen({
  search,
  setSearch,
  favoriteContacts,
  groupedContacts,
  onSelect,
  onToggleFavorite,
  onImportPhoneContacts,
  contactsStatus,
}: {
  search: string
  setSearch: (value: string) => void
  favoriteContacts: Contact[]
  groupedContacts: Record<string, Contact[]>
  onSelect: (contact: Contact) => void
  onToggleFavorite: (contactId: number) => void
  onImportPhoneContacts: () => void
  contactsStatus: string
}) {
  return (
    <section className="screen-content contacts-content with-page-title">
      <h1>Все контакты</h1>
      <div className="contacts-card">
        <div className="search-field search-wide">
          <SearchIcon />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Введите номер или имя получателя"
          />
        </div>

        <button className="import-contacts-button" type="button" onClick={onImportPhoneContacts}>
          <ContactsIcon />
          <span>Подтянуть контакты из телефона</span>
        </button>
        {contactsStatus && <p className="contacts-status">{contactsStatus}</p>}

        <h2>Избранные</h2>
        {favoriteContacts.length > 0 ? (
          favoriteContacts.map((contact) => (
            <ContactRow
              contact={contact}
              key={`fav-${contact.id}`}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
            />
          ))
        ) : (
          <p className="empty-contacts">Нажмите на звёздочку у контакта, чтобы добавить его сюда.</p>
        )}

        <h2>Контакты</h2>
        {Object.entries(groupedContacts).map(([letter, items]) => (
          <div className="contact-group" key={letter}>
            <p>{letter}</p>
            {items.map((contact) => (
              <ContactRow
                contact={contact}
                key={contact.id}
                onSelect={onSelect}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function ContactRow({
  contact,
  onSelect,
  onToggleFavorite,
}: {
  contact: Contact
  onSelect: (contact: Contact) => void
  onToggleFavorite: (contactId: number) => void
}) {
  return (
    <div className="contact-row">
      <button type="button" className="contact-select" onClick={() => onSelect(contact)}>
        <ContactAvatar contact={contact} className="initials" />
        <span className="contact-text">
          <b>{contact.name}</b>
          <small>{formatPhoneForUi(contact.phone)}</small>
        </span>
      </button>
      <button
        type="button"
        className="favorite-toggle"
        onClick={() => onToggleFavorite(contact.id)}
        aria-label={contact.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
      >
        <StarIcon filled={contact.favorite} />
      </button>
    </div>
  )
}

function ContactAvatar({ contact, className = '' }: { contact: Contact; className?: string }) {
  return (
    <span className={`contact-avatar ${className}`}>
      <img
        alt=""
        aria-hidden="true"
        src={contact.avatarUrl || `${ASSET_BASE}${encodeURIComponent('Заглушка на аватарку контакта.svg')}`}
      />
    </span>
  )
}

function AmountScreen({
  contact,
  selectedSourceCard,
  selectedDestinationBank,
  amountText,
  onOpenSourceCards,
  onOpenDestinationBanks,
  onAppend,
  onDelete,
  onSubmit,
}: {
  contact: Contact
  selectedSourceCard: BankCard
  selectedDestinationBank: DestinationBank
  amountText: string
  onOpenSourceCards: () => void
  onOpenDestinationBanks: () => void
  onAppend: (digit: string) => void
  onDelete: () => void
  onSubmit: () => void
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']

  return (
    <section className="screen-content amount-content amount-figma-screen" aria-label="Экран перевода">
      <div className="amount-recipient" aria-label="Получатель перевода">
        <ContactAvatar contact={contact} className="recipient-photo" />
        <h1>{truncateText(contact.name, 18)}</h1>
        <p>{formatPhoneForUi(contact.phone)}</p>
      </div>

      <button className="account-picker account-picker-button source-account-section" type="button" onClick={onOpenSourceCards}>
        <div className="account-icon">
          <WalletIcon />
        </div>
        <div>
          <p>Откуда</p>
          <strong>
            ••••{getCardTail(selectedSourceCard)}
            <span>{selectedSourceCard.brand}</span>
            <b>• {selectedSourceCard.balance}</b>
          </strong>
        </div>
        <ChevronDownIcon />
      </button>

      <button className="account-picker account-picker-button destination-account-section" type="button" onClick={onOpenDestinationBanks}>
        <div className="account-icon">
          <BankIcon />
        </div>
        <div>
          <p>Куда</p>
          <strong><DestinationBankLogo bank={selectedDestinationBank} /> {selectedDestinationBank.name}</strong>
        </div>
        <ChevronDownIcon />
      </button>

      <div className="amount-total" aria-label="Сумма перевода">
        <strong>{amountText}₽</strong>
        <span>Комиссия 0₽</span>
      </div>

      <button className="primary-button amount-continue-button" type="button" onClick={onSubmit}>
        Продолжить
      </button>

      <div className="keypad numeric-keypad-section">
        {keys.map((key) => (
          <button type="button" key={key} onClick={() => onAppend(key)}>
            {key}
          </button>
        ))}
        <button type="button" onClick={onDelete} aria-label="Удалить">
          <BackspaceIcon />
        </button>
      </div>
    </section>
  )
}

function SourceCardsScreen({
  cards,
  selectedCardId,
  onSelect,
}: {
  cards: BankCard[]
  selectedCardId: string
  onSelect: (cardId: string) => void
}) {
  return (
    <section className="screen-content source-cards-content with-page-title">
      <h1>Откуда</h1>
      <div className="source-cards-list">
        {cards.map((card) => (
          <button
            className={`source-card-option ${card.id === selectedCardId ? 'active' : ''}`}
            key={card.id}
            type="button"
            onClick={() => onSelect(card.id)}
          >
            <span className={`source-card-preview source-card-preview-${card.id}`}>
              {card.brand}
            </span>
            <span className="source-card-text">
              <b>{card.title}</b>
              <small>{card.type}</small>
              <strong>
                ••••{getCardTail(card)} <em>{card.brand}</em> <span>{card.balance}</span>
              </strong>
            </span>
            <span className="source-card-check">{card.id === selectedCardId ? '✓' : ''}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function CardDetailsScreen({
  card,
  isBalanceVisible,
  onToggleBalance,
}: {
  card: BankCard
  isBalanceVisible: boolean
  onToggleBalance: () => void
}) {
  const hiddenBalance = '•••••• ₽'
  const hiddenNumber = card.number.replace(/\d/g, '•')
  const isSavings = card.id === 'savings'

  return (
    <section className="screen-content card-details-content">
      <article className={`card-detail-hero card-detail-hero-${card.id}`}>
        <div className="card-detail-top">
          <span className="card-chip" />
          <b>{card.brand}</b>
        </div>

        <h1>{card.title}</h1>
        <p>{card.type}</p>
        <strong>{isBalanceVisible ? card.number : hiddenNumber}</strong>

        <div className="card-detail-balance">
          <span>{isBalanceVisible ? card.balance : hiddenBalance}</span>
          <button
            type="button"
            onClick={onToggleBalance}
            aria-label={isBalanceVisible ? 'Скрыть баланс карты' : 'Показать баланс карты'}
          >
            {isBalanceVisible ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        </div>
      </article>

      <section className="card-limit-panel">
        <div>
          <span>{isSavings ? 'Доля общего баланса' : 'Лимит расходов'}</span>
          <b>{isSavings ? '100%' : '48 350 ₽ / 75 000 ₽'}</b>
        </div>
        <div className="card-limit-track">
          <span style={{ width: isSavings ? '100%' : '64%' }} />
        </div>
      </section>

      <section className="card-detail-actions">
        <CardDetailAction
          icon={<LockIcon />}
          title="PIN-код"
          subtitle="Изменить PIN-код карты"
        />
        <CardDetailAction
          icon={<SnowflakeIcon />}
          title="Заморозить карту"
          subtitle="Можно быстро разморозить"
        />
        <CardDetailAction
          icon={<GaugeIcon />}
          title="Изменить лимит"
          subtitle="Текущий лимит 75 000 ₽"
        />
        <CardDetailAction
          icon={<StatementIcon />}
          title="Выписка"
          subtitle="Отправить на email"
        />
        <CardDetailAction
          icon={<SettingsIcon />}
          title="Настройки"
          subtitle="Безопасность и уведомления"
        />
      </section>
    </section>
  )
}

function CardDetailAction({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <button className="card-detail-action" type="button">
      <span>{icon}</span>
      <div>
        <b>{title}</b>
        <p>{subtitle}</p>
      </div>
      <ChevronRightIcon />
    </button>
  )
}

function ReviewScreen({
  contact,
  selectedSourceCard,
  selectedDestinationBank,
  amountText,
  onChange,
  onConfirm,
}: {
  contact: Contact
  selectedSourceCard: BankCard
  selectedDestinationBank: DestinationBank
  amountText: string
  onChange: () => void
  onConfirm: () => void
}) {
  return (
    <section className="screen-content review-content">
      <section className="review-summary panel">
        <h1>{amountText}.00 ₽</h1>
        <div>
          <ContactAvatar contact={contact} className="summary-photo" />
          <div>
            <strong>{contact.name}</strong>
            <p><DestinationBankLogo bank={selectedDestinationBank} /> {selectedDestinationBank.name}</p>
            <p>
              <span>С карты ••••{getCardTail(selectedSourceCard)}</span>
              <b>{selectedSourceCard.brand}</b>
            </p>
          </div>
          <button type="button" onClick={onChange}>Изменить</button>
        </div>
      </section>

      <section className="panel details-panel">
        <DetailRow label="Тип перевода" value="СБП" />
        <DetailRow label="Дата" value="01-09-2026" />
        <DetailRow label="Сумма перевода" value={`${amountText}₽`} />
        <DetailRow label="Комиссия" value="0₽" />
        <DetailRow label="Итого" value={`${amountText}₽`} />
      </section>

      <section className="warning-box">
        <div>
          <WarningIcon />
          <strong>Вы отправляете большую сумму!</strong>
        </div>
        <p>Пожалуйста внимательно проверьте детали перевода перед отправкой.</p>
      </section>

      <p className="review-note">
        Вам будет предложено подтвердить с помощью sms-сообщения или биометрии
      </p>

      <SwipeConfirm onConfirm={onConfirm} />
    </section>
  )
}

function SwipeConfirm({ onConfirm }: { onConfirm: () => void }) {
  const trackRef = useRef<HTMLButtonElement>(null)
  const [progress, setProgress] = useState(0)
  const dragging = useRef(false)

  const commit = () => {
    if (progress > 62) {
      setProgress(100)
      window.setTimeout(onConfirm, 180)
      return
    }
    setProgress(0)
  }

  const update = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }
    const handleWidth = 160
    const next = ((clientX - rect.left - handleWidth / 2) / (rect.width - handleWidth)) * 100
    setProgress(Math.max(0, Math.min(100, next)))
  }

  return (
    <button
      ref={trackRef}
      type="button"
      className="swipe-confirm"
      onClick={() => {
        if (!dragging.current) {
          onConfirm()
        }
      }}
      onPointerDown={(event) => {
        dragging.current = true
        update(event.clientX)
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (dragging.current) {
          update(event.clientX)
        }
      }}
      onPointerUp={() => {
        commit()
        window.setTimeout(() => {
          dragging.current = false
        }, 0)
      }}
      style={{ '--swipe-progress': `${progress}%` } as CSSProperties}
    >
      <span className="swipe-handle">
        <ChevronRightIcon />
        <ChevronRightIcon />
        <ChevronRightIcon />
        <ChevronRightIcon />
      </span>
      <b>Проведите, чтобы отправить</b>
    </button>
  )
}

function OtpScreen({
  contact,
  digits,
  timer,
  error,
  ready,
  onDigitChange,
  onContinue,
  onResend,
}: {
  contact: Contact
  digits: string[]
  timer: number
  error: boolean
  ready: boolean
  onDigitChange: (index: number, value: string) => void
  onContinue: () => void
  onResend: () => void
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const handleDigitChange = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, '').slice(-1)
    onDigitChange(index, nextValue)

    if (nextValue && index < digits.length - 1) {
      window.requestAnimationFrame(() => inputRefs.current[index + 1]?.focus())
    }
  }

  const handleDigitKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      window.requestAnimationFrame(() => inputRefs.current[index - 1]?.focus())
    }
  }

  return (
    <section className="screen-content otp-content">
      <div className="otp-center">
        <h1>Введите код из СМС</h1>
        <p>Отправили на {formatPhoneForUi(contact.phone)}</p>

        <div className={`otp-inputs ${error ? 'otp-error' : ''}`}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => {
                inputRefs.current[index] = node
              }}
              value={digit}
              maxLength={1}
              type="tel"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              enterKeyHint={index === digits.length - 1 ? 'done' : 'next'}
              onChange={(event) => handleDigitChange(index, event.target.value)}
              onKeyDown={(event) => handleDigitKeyDown(index, event)}
              onFocus={(event) => event.currentTarget.select()}
              aria-label={`Цифра ${index + 1}`}
            />
          ))}
        </div>

        {error && <strong className="otp-error-text">Неверный код, попробуйте ещё раз</strong>}
      </div>

      <div className="otp-bottom">
        <button className="resend-button" type="button" onClick={onResend}>
          {timer > 0
            ? `Запросить новый код через 00:${String(timer).padStart(2, '0')}`
            : 'Запросить новый код'}
        </button>
        <button className="primary-button" type="button" disabled={!ready} onClick={onContinue}>
          Продолжить
        </button>
      </div>
    </section>
  )
}

function ProcessingScreen() {
  return (
    <section className="screen-content state-content">
      <div className="process-icon">
        <RefreshIcon />
      </div>
      <h1>Обрабатываем<br />платёж...</h1>
      <p>Обычно это занимает несколько секунд.</p>
    </section>
  )
}

function SuccessScreen({
  contact,
  selectedDestinationBank,
  selectedSourceCard,
  amountText,
  onReceipt,
  onHome,
}: {
  contact: Contact
  selectedDestinationBank: DestinationBank
  selectedSourceCard: BankCard
  amountText: string
  onReceipt: () => void
  onHome: () => void
}) {
  return (
    <section className="screen-content success-content">
      <div className="success-title">
        <SuccessTransferIcon />
        <h1>Перевод успешно<br />выполнен!</h1>
        <p>Ваши деньги уже доставлены.</p>
      </div>

      <div className="success-amount">
        <p>Отправлено</p>
        <strong>{amountText}₽</strong>
      </div>

      <section className="panel success-details">
        <DetailRow
          label="Получатель"
          valueComponent={
            <span className="inline-detail-with-avatar">
              <ContactAvatar contact={contact} className="tiny-photo" />
              <span>{truncateText(contact.name, 14)}</span>
            </span>
          }
        />
        <DetailRow
          label="Банк"
          valueComponent={<><DestinationBankLogo bank={selectedDestinationBank} /> {selectedDestinationBank.name}</>}
        />
        <DetailRow label="Списано с" value={formatCardForReceipt(selectedSourceCard)} />
        <DetailRow label="Дата" value={formatReceiptDate(new Date())} />
        <DetailRow label="Комиссия" value="0₽" />
      </section>

      <button className="receipt-open" type="button" onClick={onReceipt}>
        Чек
      </button>

      <button className="primary-button" type="button" onClick={onHome}>
        Вернуться на главный
      </button>
    </section>
  )
}

function TransferErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="screen-content state-content error-content">
      <div className="error-cross" />
      <h1>Ошибка перевода<br />«Проблема соединения»</h1>
      <p>Проблема с вашей стороны.</p>
      <p>Проверьте ваше подключение и попробуйте снова.</p>
      <button className="primary-button" type="button" onClick={onRetry}>
        Повторить
      </button>
    </section>
  )
}

function TransactionDetailsModal({
  operation,
  card,
  onRepeat,
  onClose,
}: {
  operation: Operation
  card: BankCard
  onRepeat: () => void
  onClose: () => void
}) {
  const isIncome = operation.tone === 'income'
  const category = getOperationCategory(operation)
  const amount = operation.amount.replace(/^[+-]/, '')
  const hasFullRepeatData = hasRepeatMetadata(operation)

  return (
    <div className="modal-backdrop transaction-backdrop" role="presentation" onClick={onClose}>
      <section
        className="transaction-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="transaction-close" type="button" onClick={onClose} aria-label="Закрыть">
          <CloseIcon />
        </button>

        <p className="transaction-date">{formatReceiptDate(new Date())}</p>
        <div className={`transaction-logo ${isIncome ? 'income' : 'outcome'}`}>
          <OperationLogo operation={operation} />
        </div>
        <h1 id="transaction-title">{operation.title}</h1>
        <div className="transaction-chips">
          <span>{category}</span>
          <button type="button" aria-label="Редактировать категорию">
            <EditIcon />
          </button>
        </div>

        <strong className={`transaction-amount ${operation.tone}`}>
          {isIncome ? '+' : '-'}{amount}
        </strong>
        <p className="transaction-status">Операция выполнена</p>

        <button className="transaction-ignore" type="button">
          Не учитывать
        </button>

        <button className="transaction-repeat-button" type="button" onClick={onRepeat}>
          Повторить перевод
        </button>

        {!hasFullRepeatData && (
          <p className="transaction-warning">
            Для старой операции часть данных может быть заполнена по умолчанию.
          </p>
        )}

        <section className="transaction-info-card">
          <h2>{isIncome ? 'Пополнение' : 'Списание'}</h2>
          <div className="transaction-account">
            <span>{card.brand}</span>
            <div>
              <b>{card.title}</b>
              <p>•••• {getCardTail(card)} • {card.balance}</p>
            </div>
            <ChevronRightIcon />
          </div>
        </section>

        <section className="transaction-info-card">
          <h2>Реквизиты</h2>
          <DetailRow label={isIncome ? 'Отправитель' : 'Получатель'} value={operation.title} />
          <DetailRow label="Категория" value={category} />
          <DetailRow label="ID операции" value={operation.id.toUpperCase().slice(0, 14)} />
        </section>
      </section>
    </div>
  )
}

function TemplateCreateSheet({
  operations,
  onClose,
  onPickHistory,
  onAddTemplate,
}: {
  operations: Operation[]
  onClose: () => void
  onPickHistory: () => void
  onAddTemplate: (operation: Operation) => void
}) {
  const historyOperations = operations.slice(0, 4)

  return (
    <div className="modal-backdrop template-sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="template-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="template-sheet-header">
          <h1 id="template-sheet-title">Создать</h1>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>

        <button
          className="template-create-option"
          type="button"
          onClick={() => {
            onClose()
            onPickHistory()
          }}
        >
          <span>
            <ClockIcon />
          </span>
          <div>
            <b>Открыть всю историю операций</b>
            <p>Посмотреть все операции и выбрать подходящую для шаблона</p>
          </div>
        </button>

        <div className="template-history-list">
          {historyOperations.map((operation) => (
            <button
              key={operation.id}
              type="button"
              onClick={() => onAddTemplate(operation)}
            >
              <OperationLogo operation={operation} />
              <div>
                <b>{operation.title}</b>
                <p>{operation.amount} • {getOperationCategory(operation)}</p>
              </div>
              <ChevronRightIcon />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function QrScannerModal({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const [status, setStatus] = useState('Запрашиваем доступ к камере...')
  const [result, setResult] = useState('')

  useEffect(() => {
    let active = true

    const stopCamera = () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Этот браузер не поддерживает доступ к камере.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })

        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        const video = videoRef.current
        if (!video) {
          stopCamera()
          return
        }

        video.srcObject = stream
        await video.play()

        const Detector = (window as WindowWithBarcodeDetector).BarcodeDetector
        if (!Detector) {
          setStatus('Камера открыта. Считывание QR доступно в Chrome/Android с BarcodeDetector.')
          return
        }

        const detector = new Detector({ formats: ['qr_code'] })
        setStatus('Наведи камеру на QR-код')

        const scan = async () => {
          if (!active || !videoRef.current) {
            return
          }

          try {
            const codes = await detector.detect(videoRef.current)
            const qrValue = codes[0]?.rawValue

            if (qrValue) {
              setResult(qrValue)
              setStatus('QR-код считан')
              stopCamera()
              return
            }
          } catch {
            setStatus('Не удалось считать кадр. Попробуйте поднести QR ближе.')
          }

          frameRef.current = window.requestAnimationFrame(scan)
        }

        frameRef.current = window.requestAnimationFrame(scan)
      } catch {
        setStatus('Доступ к камере не выдан. Разрешите камеру в настройках браузера.')
      }
    }

    startScanner()

    return () => {
      active = false
      stopCamera()
    }
  }, [])

  return (
    <div className="modal-backdrop qr-scanner-backdrop" role="presentation" onClick={onClose}>
      <section
        className="qr-scanner-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-scanner-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="qr-scanner-header">
          <div>
            <h1 id="qr-scanner-title">QR-сканер</h1>
            <p>{status}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>

        <div className={`qr-camera ${result ? 'scanned' : ''}`}>
          <video ref={videoRef} playsInline muted aria-label="Камера для сканирования QR" />
          <span className="qr-frame-corner top-left" />
          <span className="qr-frame-corner top-right" />
          <span className="qr-frame-corner bottom-left" />
          <span className="qr-frame-corner bottom-right" />
          {!result && <b>Поместите QR-код в рамку</b>}
        </div>

        {result && (
          <section className="qr-result-card">
            <span>Результат сканирования</span>
            <p>{result}</p>
          </section>
        )}
      </section>
    </div>
  )
}

function DestinationBankSheet({
  banks,
  selectedBankId,
  onSelect,
  onClose,
}: {
  banks: DestinationBank[]
  selectedBankId: string
  onSelect: (bankId: string) => void
  onClose: () => void
}) {
  const priorityBankId = 'gazprom'

  return (
    <div className="modal-backdrop bank-sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="bank-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="bank-sheet-header">
          <div>
            <h1 id="bank-sheet-title">Выберите банк</h1>
            <p>Куда отправить перевод</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>

        <div className="bank-options">
          {banks.map((bank) => {
            const isPriority = bank.id === priorityBankId

            return (
              <button
                className={`bank-option ${bank.id === selectedBankId ? 'active' : ''} ${isPriority ? 'priority' : ''}`}
                key={bank.id}
                type="button"
                onClick={() => onSelect(bank.id)}
              >
                <span className="bank-option-logo">
                  <DestinationBankLogo bank={bank} />
                </span>
                <span className="bank-option-copy">
                  {isPriority && <small>Приоритетный банк</small>}
                  <span>{bank.name}</span>
                </span>
                <b>{bank.id === selectedBankId ? '✓' : ''}</b>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function InsufficientFundsModal({
  amountText,
  selectedSourceCard,
  onChangeAmount,
  onChooseCard,
  onClose,
}: {
  amountText: string
  selectedSourceCard: BankCard
  onChangeAmount: () => void
  onChooseCard: () => void
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="insufficient-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insufficient-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть">
          <CloseIcon />
        </button>

        <div className="insufficient-hero">
          <div className="insufficient-icon">
            <WalletIcon />
          </div>
          <h1 id="insufficient-title">Недостаточно средств</h1>
          <p>На выбранной карте не хватает денег для этого перевода.</p>
        </div>

        <section className="insufficient-card panel">
          <DetailRow label="Сумма перевода" value={`${amountText}₽`} />
          <DetailRow label="Доступно" value={selectedSourceCard.balance} />
          <DetailRow
            label="Карта"
            value={`${selectedSourceCard.brand} ••••${getCardTail(selectedSourceCard)}`}
          />
        </section>

        <div className="insufficient-actions">
          <button className="primary-button" type="button" onClick={onChangeAmount}>
            Изменить сумму
          </button>
          <button className="secondary-button" type="button" onClick={onChooseCard}>
            Выбрать другую карту
          </button>
        </div>
      </section>
    </div>
  )
}

function ReceiptScreen({
  contact,
  selectedDestinationBank,
  selectedSourceCard,
  amountText,
  onSend,
}: {
  contact: Contact
  selectedDestinationBank: DestinationBank
  selectedSourceCard: BankCard
  amountText: string
  onSend: () => void
}) {
  return (
    <section className="screen-content receipt-content">
      <h1>Чек</h1>
      <article className="receipt-card">
        <span className="receipt-status">• Выполнено</span>
        <p>Сумма перевода</p>
        <strong>{amountText}.00 ₽</strong>
        <hr />
        <small>Получатель</small>
        <div className="receipt-person">
          <ContactAvatar contact={contact} className="tiny-photo" />
          <div>
            <b>{contact.name}</b>
            <p>{selectedDestinationBank.name} •••• 2872</p>
          </div>
        </div>
        <DetailRow label="Счёт списания" value={formatCardForReceipt(selectedSourceCard)} />
        <DetailRow label="Дата и время" value={formatReceiptDate(new Date())} />
        <DetailRow label="Комиссия" value="0.00 ₽" />
        <DetailRow label="Итого списано" value={`${amountText}.00 ₽`} />
        <div className="receipt-id-box">
          <p>Transaction ID</p>
          <strong>TXN-8922-А1-89</strong>
          <p>Bank reference</p>
          <strong>REF-442-990-112</strong>
        </div>
      </article>
      <button className="primary-button" type="button" onClick={onSend}>
        Отправить чек
      </button>
    </section>
  )
}

function AccountsScreen() {
  return (
    <section className="screen-content placeholder-content">
      <h1>Счета</h1>
      <p>Раздел подключён к навигации и готов к расширению в дипломном прототипе.</p>
    </section>
  )
}

function SupportScreen() {
  return (
    <section className="screen-content placeholder-content">
      <h1>Поддержка</h1>
      <p>Здесь можно добавить чат, частые вопросы и быстрые действия.</p>
    </section>
  )
}

function ProfileScreen({
  personalContact,
  onSettings,
}: {
  personalContact: Contact
  onSettings: () => void
}) {
  const [isPersonalOpen, setIsPersonalOpen] = useState(true)

  return (
    <section className="screen-content profile-content">
      <header className="profile-topbar">
        <h1>Профиль</h1>
        <button className="profile-bell" type="button" aria-label="Уведомления">
          <BellIcon />
        </button>
      </header>

      <section className="profile-hero">
        <ContactAvatar contact={personalContact} className="profile-avatar" />
        <div>
          <h2>Имя Фамилия</h2>
          <p>{formatPhoneForUi(personalContact.phone)}</p>
        </div>
      </section>

      <section className={`profile-card profile-accordion ${isPersonalOpen ? 'open' : ''}`}>
        <button type="button" onClick={() => setIsPersonalOpen((open) => !open)}>
          <span className="profile-row-icon">
            <UserIcon />
          </span>
          <span>Персональная информация</span>
          <ChevronDownIcon />
        </button>

        {isPersonalOpen && (
          <div className="profile-details">
            <p>
              <span>ФИО</span>
              <b>Имя Фамилия</b>
            </p>
            <p>
              <span>Телефон</span>
              <b>{formatPhoneForUi(personalContact.phone)}</b>
            </p>
            <p>
              <span>Email</span>
              <b>student.bank@app.ru</b>
            </p>
          </div>
        )}
      </section>

      <button className="profile-card profile-action" type="button" onClick={onSettings}>
        <span className="profile-row-icon">
          <SettingsIcon />
        </span>
        <span>Настройки</span>
        <ChevronRightIcon />
      </button>

      <button className="profile-card profile-action" type="button">
        <span className="profile-row-icon">
          <LogoutIcon />
        </span>
        <span>Log out</span>
        <ChevronRightIcon />
      </button>

      <section className="profile-member-card">
        <div>
          <span>Member ID</span>
          <b>19202033724</b>
        </div>
        <button type="button">
          <CopyIcon />
          Копировать
        </button>
      </section>
    </section>
  )
}

function SettingsScreen({
  widgets,
  threshold,
  onMoveWidget,
  onToggleWidget,
  onThresholdChange,
}: {
  widgets: HomeWidgetSetting[]
  threshold: string
  onMoveWidget: (widgetId: HomeWidgetId, direction: 1 | -1) => void
  onToggleWidget: (widgetId: HomeWidgetId) => void
  onThresholdChange: (value: string) => void
}) {
  return (
    <section className="screen-content settings-content">
      <header className="settings-header">
        <h1>Настройки</h1>
        <p>Персонализация главного экрана и сценариев безопасности.</p>
      </header>

      <section className="profile-card settings-panel">
        <div className="settings-section-title">
          <h2>Главный экран</h2>
          <p>Скрывайте виджеты и меняйте порядок стрелками. Настройки сохраняются на устройстве.</p>
        </div>

        <div className="widget-settings-list">
          {widgets.map((widget, index) => (
            <article className={`widget-setting ${widget.visible ? '' : 'hidden-widget'}`} key={widget.id}>
              <div>
                <b>{widget.title}</b>
                <span>{widget.visible ? 'Показывается' : 'Скрыт'}</span>
              </div>

              <div className="widget-controls">
                <button
                  type="button"
                  onClick={() => onMoveWidget(widget.id, -1)}
                  disabled={index === 0}
                  aria-label={`Поднять ${widget.title}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMoveWidget(widget.id, 1)}
                  disabled={index === widgets.length - 1}
                  aria-label={`Опустить ${widget.title}`}
                >
                  ↓
                </button>
                <button
                  className={widget.visible ? 'active' : ''}
                  type="button"
                  onClick={() => onToggleWidget(widget.id)}
                >
                  {widget.visible ? 'Скрыть' : 'Показать'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="profile-card settings-panel">
        <div className="settings-section-title">
          <h2>Усиленное подтверждение</h2>
          <p>Переводы ниже этой суммы сразу уходят в обработку без дополнительного подтверждения.</p>
        </div>

        <label className="threshold-field">
          <span>Порог суммы</span>
          <div>
            <input
              type="text"
              inputMode="numeric"
              value={threshold}
              onChange={(event) => onThresholdChange(event.target.value)}
              aria-label="Порог усиленного подтверждения"
            />
            <b>₽</b>
          </div>
        </label>
      </section>
    </section>
  )
}

function Toast({ message }: { message: string }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <span aria-hidden="true">✓</span>
      <strong>{message}</strong>
    </div>
  )
}

function DetailRow({
  label,
  value,
  valueComponent,
}: {
  label: string
  value?: string
  valueComponent?: ReactNode
}) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{valueComponent ?? value}</strong>
    </div>
  )
}

function BottomNav({
  activeTab,
  onTabChange,
  onQrScan,
}: {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  onQrScan: () => void
}) {
  return (
    <nav className="bottom-nav">
      <button
        className={activeTab === 'home' ? 'active' : ''}
        type="button"
        onClick={() => onTabChange('home')}
      >
        <HomeLineIcon />
        <span>Главная</span>
      </button>
      <button
        className={activeTab === 'transfers' ? 'active' : ''}
        type="button"
        onClick={() => onTabChange('transfers')}
      >
        <TransferIcon />
        <span>Переводы</span>
      </button>
      <button className="qr-action" type="button" onClick={onQrScan} aria-label="Открыть QR-сканер">
        <QrIcon />
      </button>
      <button
        className={activeTab === 'accounts' ? 'active' : ''}
        type="button"
        onClick={() => onTabChange('accounts')}
      >
        <AccountsIcon />
        <span>Счета</span>
      </button>
      <button
        className={activeTab === 'support' ? 'active' : ''}
        type="button"
        onClick={() => onTabChange('support')}
      >
        <UserIcon />
        <span>Поддержка</span>
      </button>
    </nav>
  )
}

function Svg({ children, viewBox = '0 0 24 24' }: { children: ReactNode; viewBox?: string }) {
  return (
    <svg viewBox={viewBox} aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

function AssetIcon({
  file,
  className = '',
}: {
  file: string
  className?: string
}) {
  return (
    <img
      className={`asset-icon ${className}`}
      src={`${ASSET_BASE}${encodeURIComponent(file)}`}
      alt=""
      aria-hidden="true"
    />
  )
}

function ArrowLeftIcon() {
  return <Svg><path d="M19 12H5m6-6-6 6 6 6" /></Svg>
}

function BellIcon() {
  return <AssetIcon file="уведомления.svg" />
}

function EyeIcon() {
  return <AssetIcon file="скрыть баланс.svg" className="eye-icon-img" />
}

function EyeOffIcon() {
  return <Svg><path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12a16.4 16.4 0 0 1-3 3.2M9.9 6.9A9 9 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5M3 3l18 18" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Svg>
}

function ArrowUpRightIcon() {
  return <AssetIcon file="Layer_1.svg" />
}

function ArrowDownLeftIcon() {
  return <AssetIcon file="Layer_1-1.svg" />
}

function CardPlusIcon() {
  return <AssetIcon file="Иконка пополнения.svg" />
}

function HeartIcon() {
  return <AssetIcon file="Иконка выгоды.svg" />
}

function SearchIcon() {
  return <AssetIcon file="search icon.svg" />
}

function ContactsIcon() {
  return <AssetIcon file="noun-contact-7969378 1.svg" />
}

function PlusIcon() {
  return <Svg><path d="M12 5v14M5 12h14" /></Svg>
}

function BeelineLogo() {
  return <AssetIcon file="beeline-sign-logo 1.svg" className="beeline-logo-img" />
}

function TemplateOperationIcon() {
  return <Svg><path d="M7 7h10M7 12h10M7 17h6" /><path d="M5 3h14a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z" /></Svg>
}

function DestinationBankLogo({ bank }: { bank: DestinationBank }) {
  return <AssetIcon file={bank.iconFile} className="destination-bank-logo-img" />
}

function WalletsIcon() {
  return <AssetIcon file="noun-card-transfer-2985106 1.svg" />
}

function BankIcon() {
  return <AssetIcon file="noun-bank-607257 1.svg" />
}

function CardIcon() {
  return <AssetIcon file="noun-card-number-456023 1.svg" />
}

function ListIcon() {
  return <AssetIcon file="noun-details-2941955 1.svg" />
}

function MonitorIcon() {
  return <AssetIcon file="noun-smart-tv-4026387 1.svg" />
}

function HomeLineIcon() {
  return <AssetIcon file="noun-house-1745674 1.svg" />
}

function WalletIcon() {
  return <AssetIcon file="noun-wallet-8368005 откуда icon1.svg" />
}

function ChevronDownIcon() {
  return <Svg><path d="m6 9 6 6 6-6" /></Svg>
}

function CloseIcon() {
  return <Svg><path d="m6 6 12 12M18 6 6 18" /></Svg>
}

function EditIcon() {
  return <Svg><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13 7 4 4" /></Svg>
}

function ClockIcon() {
  return <Svg><path d="M12 7v6l4 2" /><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></Svg>
}

function BackspaceIcon() {
  return <AssetIcon file="Стереть.svg" />
}

function SuccessTransferIcon() {
  return <AssetIcon file="Перевод успешно выполнен.svg" className="success-transfer-icon" />
}

function WarningIcon() {
  return <AssetIcon file="noun-warning-sign-8005298 1.svg" />
}

function ChevronRightIcon() {
  return <Svg><path d="m9 6 6 6-6 6" /></Svg>
}

function SettingsIcon() {
  return (
    <Svg>
      <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" />
      <path d="m19.4 13.5.1-1.5-.1-1.5 2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.6A8 8 0 0 0 7 6.6l-2.4-1-2 3.4 2 1.5-.1 1.5.1 1.5-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.6 1.5l.4 2.6h4l.4-2.6a8 8 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5Z" />
    </Svg>
  )
}

function LockIcon() {
  return <Svg><path d="M7 10V7a5 5 0 0 1 10 0v3" /><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M12 14v3" /></Svg>
}

function SnowflakeIcon() {
  return (
    <Svg>
      <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
      <path d="m9 4.8 3 3 3-3M9 19.2l3-3 3 3M5.8 10.2l4.1-1.1-1.1-4.1M18.2 13.8l-4.1 1.1 1.1 4.1M18.2 10.2l-4.1-1.1 1.1-4.1M5.8 13.8l4.1 1.1-1.1 4.1" />
    </Svg>
  )
}

function GaugeIcon() {
  return <Svg><path d="M4 14a8 8 0 1 1 16 0" /><path d="M12 14l4-4" /><path d="M8 20h8" /></Svg>
}

function StatementIcon() {
  return <Svg><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v5h5M10 12h6M10 16h6" /></Svg>
}

function LogoutIcon() {
  return <Svg><path d="M10 5H5v14h5M15 8l4 4-4 4M9 12h10" /></Svg>
}

function CopyIcon() {
  return <Svg><path d="M8 8h10v10H8z" /><path d="M6 16H4V4h12v2" /></Svg>
}

function RefreshIcon() {
  return <Svg viewBox="0 0 120 120"><path d="M25 55a36 36 0 0 1 66-16" /><path d="m80 22 12 18-22-2" /><path d="M95 65a36 36 0 0 1-66 16" /><path d="m40 98-12-18 22 2" /></Svg>
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <AssetIcon
      file={filled ? 'star favorite icon.svg' : 'star unfavorite icon.svg'}
      className={filled ? 'filled' : ''}
    />
  )
}

function TransferIcon() {
  return <AssetIcon file="переводы icon1.svg" />
}

function QrIcon() {
  return <AssetIcon file="qr code.svg" />
}

function AccountsIcon() {
  return <AssetIcon file="noun-card-number-456023 1.svg" />
}

function UserIcon() {
  return <AssetIcon file="поддержка icon.svg" />
}

export default App
